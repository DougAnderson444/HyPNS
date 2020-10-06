const Corestore = require("corestore");
const SwarmNetworker = require("@corestore/networker");

const Multifeed = require("hypermultifeed");
const MultifeedNetworker = require("hypermultifeed/networker");

var kappa = require("kappa-core");
var list = require("@DougAnderson444/kappa-view-list");
var memdb = require("level-mem");

var RAM = require("random-access-memory");
const RAI = require("@DougAnderson444/random-access-idb");

const pify = require("pify"); // promisify
var EventEmitter = require("events").EventEmitter;
const once = require("events.once"); // polyfill for nodejs events.once in the browser

const hcrypto = require("hypercore-crypto");
const sodium = require("sodium-universal");

let isBrowser = process.title === "browser";

class HyPNS {
  constructor(keypair, opts) {
    if (
      !keypair.publicKey ||
      Buffer.byteLength(keypair.publicKey, "hex") !==
        sodium.crypto_sign_PUBLICKEYBYTES
    )
      throw new Error("Must include a publicKey");
    this._keypair = keypair;
    this.latest = new EventEmitter();
    this.core;
    this.publish;
    this._storage = opts.persist == false ? RAM : getNewStorage();
    this.ready = this.open();
  }

  async open() {
    return new Promise(async (resolve, reject) => {
      var self = this;
      const store = new Corestore(this._storage);

      const swarmOpts = {};
      const swarmNetworker = new SwarmNetworker(store, swarmOpts);
      var network = new MultifeedNetworker(swarmNetworker); // multi + network = swarm

      var multi = new Multifeed(store, {
        rootKey: this._keypair.publicKey,
        valueEncoding: "json",
      });
      network.swarm(multi);

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

      this.core = kappa(store, { multifeed: multi }); // store not used since we pass in a multifeed

      // read
      this.core.use("pointer", timestampView);
      this.core.api.pointer.tail(1, function (msgs) {
        self.latest.emit("update", msgs[0].value);
      });

      // if writable, wait for writeify to complete
      if (this.writable()) await this.writeify();
      resolve(true);
    });
  }

  writable() {
    if (!this._keypair.secretKey) return false;
    if (
      Buffer.byteLength(this._keypair.secretKey, "hex") !==
      sodium.crypto_sign_SECRETKEYBYTES
    )
      return false;

    const message = Buffer.from("any msg will do", "utf8")

    // sign something with this secretKey
    const signature = Buffer.allocUnsafe(sodium.crypto_sign_BYTES)
    sodium.crypto_sign_detached(signature, message, Buffer.from(this._keypair.secretKey, "hex"))

    // verify the signature matches the given public key
    return sodium.crypto_sign_verify_detached(signature, message, Buffer.from(this._keypair.publicKey, 'hex')) 
  }

  async writeify() {
    return new Promise(async (resolve, reject) => {
      var self = this;

      // write
      this.core.ready("pointer", () => {
        self.core.writer("kappa-local", function (err, feed) {
          if (err) reject(err);

          function pub(data) {
            const signature = hcrypto.sign(
              Buffer.from(self._keypair.publicKey, "hex"),
              Buffer.from(self._keypair.secretKey, "hex")
            );
            let objPub = {
              ...data,
              signature,
              timestamp: new Date().toISOString(),
            };
            this.append(objPub); // this gets bound to the object's kappa-local feed above
            return objPub;
          }

          self.publish = pub.bind(feed); // bind feed to this in pub()

          feed.ready(() => resolve(true));
        });
      });
    });
  }
  get publicKey() {
    return this._keypair.publicKey.toString("hex");
  }

  async read() {
    // get the last saved entry
    const msgs = await pify(this.core.api.pointer.read)({
      limit: 1,
      reverse: true,
    });
    return msgs && msgs.length > 0 && msgs[0].value && msgs[0].value.text
      ? msgs[0].value.text
      : null;
  }
}

module.exports = HyPNS;

function getNewStorage() {
  if (isBrowser) {
    return RAI("hypns"); // browser
  } else {
    return require("tmp").dirSync({
      prefix: "hypns-",
    }).name;
  }
}
