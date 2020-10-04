const Corestore = require("corestore");
const SwarmNetworker = require("@corestore/networker");

const Multifeed = require("hypermultifeed");
const MultifeedNetworker = require("hypermultifeed/networker");

var kappa = require("kappa-core");
var list = require("@DougAnderson444/kappa-view-list");
var memdb = require("level-mem");

var RAM = require("random-access-memory");
const RAI = require("@DougAnderson444/random-access-idb");

let isBrowser = process.title === "browser";

class HyPNS {
  constructor(keypair, opts) {
    this._keypair = keypair;
    this._latest = null;
    this._storage = opts.persist == false ? RAM : getNewStorage();
    this.ready = this.open.bind(this);
  }

  open(cb) {
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

    var core = kappa(store, { multifeed: multi }); // store not used since we pass in a multifeed
    core.use("pointer", timestampView);
    core.ready("pointer", () => {
      core.writer("kappa-local", function (err, feed) {
        if (err) console.error(err);
        self.publish = self.publish.bind(feed);
        feed.ready(() => {
          core.api.pointer.tail(1, function (msgs) {
            self._latest = msgs[0].value;
          });

          cb();
        });
      });
    });
  }

  publish(data) {
    let objPub = {
      ...data,
      timestamp: new Date().toISOString(),
    };
    this.append(objPub); // this. gets bound to the object's kappa-local feed above 
    return objPub;
  }

  get publicKey() {
    return this._keypair.publicKey.toString("hex");
  }

  get latest() {
    return this._latest;
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
