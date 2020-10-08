"use strict";

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

var Corestore = require("corestore");

var SwarmNetworker = require("@corestore/networker");

var Multifeed = require("hypermultifeed");

var MultifeedNetworker = require("hypermultifeed/networker");

var kappa = require("kappa-core");

var list = require("@DougAnderson444/kappa-view-list");

var memdb = require("level-mem");

var RAM = require("random-access-memory");

var RAI = require("@DougAnderson444/random-access-idb");

var pify = require("pify"); // promisify


var EventEmitter = require("events").EventEmitter;

var once = require("events.once"); // polyfill for nodejs events.once in the browser


var hcrypto = require("hypercore-crypto");

var sodium = require("sodium-universal");

var isBrowser = process.title === "browser";

class HyPNS {
  constructor(keypair, opts) {
    if (!keypair.publicKey || Buffer.byteLength(keypair.publicKey, "hex") !== sodium.crypto_sign_PUBLICKEYBYTES) throw new Error("Must include a publicKey");
    this._keypair = keypair;
    this.latest = new EventEmitter();
    this.core;
    this.multi;
    this.swarmNetworker;

    this.publish = () => {
      return null;
    };

    this._storage = opts.persist === false || !opts.storage ? RAM : getNewStorage();
    this.ready = this.open();
  }

  open() {
    var _this = this;

    return _asyncToGenerator(function* () {
      return new Promise( /*#__PURE__*/function () {
        var _ref = _asyncToGenerator(function* (resolve, reject) {
          var self = _this;
          var store = new Corestore(_this._storage);
          var swarmOpts = {};
          _this.swarmNetworker = new SwarmNetworker(store, swarmOpts);
          var network = new MultifeedNetworker(_this.swarmNetworker);
          _this.multi = new Multifeed(store, {
            rootKey: _this._keypair.publicKey,
            valueEncoding: "json"
          });
          network.swarm(_this.multi); // handle shutdown gracefully

          var closeHandler = /*#__PURE__*/function () {
            var _ref2 = _asyncToGenerator(function* () {
              console.log("Shutting down...");
              yield _this.close();
              process.exit();
            });

            return function closeHandler() {
              return _ref2.apply(this, arguments);
            };
          }();

          process.on("SIGINT", closeHandler);
          process.on("SIGTERM", closeHandler);
          /**
           * KAPPA VIEWS of the multifeed
           */

          var timestampView = list(memdb(), function (msg, next) {
            if (msg.value.timestamp && typeof msg.value.timestamp === "string") {
              // sort on the 'timestamp' field
              next(null, [msg.value.timestamp]);
            } else {
              next();
            }
          });
          _this.core = kappa(store, {
            multifeed: _this.multi
          }); // store not used since we pass in a multifeed
          // read

          _this.core.use("pointer", timestampView);

          _this.core.api.pointer.tail(1, msgs => {
            self.latest.emit("update", msgs[0].value);
          });

          _this.core.ready("pointer", () => {
            // writer
            // TODO: is a writer required for read only?
            if (_this.writable()) {
              _this.core.writer("kappa-local", (err, feed) => {
                if (err) reject(err);

                function pub(data) {
                  var timestamp = new Date().toISOString();
                  var signature = hcrypto.sign(Buffer.from(data.text + " " + timestamp, "utf8"), Buffer.from(self._keypair.secretKey, "hex") // has to be self._ so that .bind doesn't replace it with feed
                  );

                  var objPub = _objectSpread(_objectSpread({}, data), {}, {
                    signature: signature.toString("hex"),
                    timestamp
                  });

                  this.append(objPub); // this gets bound to the object's kappa-local feed above

                  return objPub;
                }

                _this.publish = pub.bind(feed); // bind feed to this in pub()

                feed.ready(() => resolve(true));
              });
            } else {
              resolve(true);
            }
          });
        });

        return function (_x, _x2) {
          return _ref.apply(this, arguments);
        };
      }());
    })();
  }

  close() {
    var _this2 = this;

    return _asyncToGenerator(function* () {
      _this2.multi.close();

      yield _this2.swarmNetworker.close(); //Shut down the swarm networker.
    })();
  }

  writable() {
    if (!this._keypair.secretKey) return false;
    if (Buffer.byteLength(this._keypair.secretKey, "hex") !== sodium.crypto_sign_SECRETKEYBYTES) return false;
    var message = Buffer.from("any msg will do", "utf8"); // sign something with this secretKey

    var signature = Buffer.allocUnsafe(sodium.crypto_sign_BYTES);
    sodium.crypto_sign_detached(signature, message, Buffer.from(this._keypair.secretKey, "hex")); // verify the signature matches the given public key

    return sodium.crypto_sign_verify_detached(signature, message, Buffer.from(this._keypair.publicKey, "hex"));
  }

  get publicKey() {
    return this._keypair.publicKey.toString("hex");
  }

  read() {
    var _this3 = this;

    return _asyncToGenerator(function* () {
      // get the last saved entry
      var msgs = yield pify(_this3.core.api.pointer.read)({
        limit: 1,
        reverse: true
      });

      var valid = msgs && msgs.length > 0 && msgs[0].value && msgs[0].value.text && _this3.verify(msgs[0].value.text + " " + msgs[0].value.timestamp, msgs[0].value.signature);

      return valid ? msgs[0].value.text : null;
    })();
  }

  verify(message, signature) {
    // verify(message, signature, publicKey) // verify the signature of this value matches the public key under which it was published
    return hcrypto.verify(Buffer.from(message, "utf8"), Buffer.from(signature, "hex"), Buffer.from(this._keypair.publicKey, "hex"));
  }

}

module.exports = HyPNS;

function getNewStorage() {
  if (isBrowser) return RAI("hypns");else return require("tmp").dirSync({
    prefix: "hypns-"
  }).name;
}