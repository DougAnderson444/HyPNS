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

let isBrowser = process.title === "browser";

class HyPNS {
  constructor(keypair, opts) {
    this._keypair = keypair;
    this.latest = null;
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
      this.core.use("pointer", timestampView);
      this.core.ready("pointer", () => {
        self.core.writer("kappa-local", function (err, feed) {
          if (err) {
            reject(false);
            throw err;
          }

          function pub(data) {
            let objPub = {
              ...data,
              timestamp: new Date().toISOString(),
            };
            //await pify(this.append)(objPub); // this. gets bound to the object's kappa-local feed above
            this.append(objPub);
            return objPub;
          }

          self.publish = pub.bind(feed);

          feed.ready(() => {
            self.latest = new EventEmitter();
            self.core.api.pointer.tail(1, function (msgs) {
              self.latest.emit("update", msgs[0].value);
            });
            resolve(true);
          });
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
    // Get a random number, use it for random-access-application
    const name = "hypns"; // + new Date(Date.now()).toLocaleString();
    //return RAA(name);
    return RAI(name);
  } else {
    return require("tmp").dirSync({
      prefix: "hypns-",
    }).name;
  }
}
