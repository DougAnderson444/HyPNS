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
    this.multi;
    this.swarmNetworker;
    this.publish = () => {
      return null;
    };
    this._storage =
      opts.persist === false || !opts.storage ? RAM : getNewStorage();
    this.ready = this.open();
  }

  async open() {
    return new Promise(async (resolve, reject) => {
      var self = this;
      const store = new Corestore(this._storage);

      const swarmOpts = {};
      this.swarmNetworker = new SwarmNetworker(store, swarmOpts);
      var network = new MultifeedNetworker(this.swarmNetworker);

      this.multi = new Multifeed(store, {
        rootKey: this._keypair.publicKey,
        valueEncoding: "json",
      });
      network.swarm(this.multi);

      // handle shutdown gracefully
      const closeHandler = async () => {
        console.log("Shutting down...");
        await this.close();
        process.exit();
      };

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

      this.core = kappa(store, { multifeed: this.multi }); // store not used since we pass in a multifeed

      // read
      this.core.use("pointer", timestampView);
      this.core.api.pointer.tail(1, (msgs) => {
        self.latest.emit("update", msgs[0].value);
      });

      this.core.ready("pointer", () => {
        // writer
        // TODO: is a writer required for read only?
        if (this.writable()) {
          this.core.writer("kappa-local", (err, feed) => {
            if (err) reject(err);

            function pub(data) {
              const timestamp = new Date().toISOString();
              const signature = hcrypto.sign(
                Buffer.from(data.text + " " + timestamp, "utf8"),
                Buffer.from(self._keypair.secretKey, "hex") // has to be self._ so that .bind doesn't replace it with feed
              );
              let objPub = {
                ...data,
                signature: signature.toString("hex"),
                timestamp,
              };
              this.append(objPub); // this gets bound to the object's kappa-local feed above
              return objPub;
            }

            this.publish = pub.bind(feed); // bind feed to this in pub()

            feed.ready(() => resolve(true));
          });
        } else {
          resolve(true);
        }
      });
    });
  }

  async close() {
    this.multi.close();
    await this.swarmNetworker.close(); //Shut down the swarm networker.
  }

  writable() {
    if (!this._keypair.secretKey) return false;
    if (
      Buffer.byteLength(this._keypair.secretKey, "hex") !==
      sodium.crypto_sign_SECRETKEYBYTES
    )
      return false;

    const message = Buffer.from("any msg will do", "utf8");

    // sign something with this secretKey
    const signature = Buffer.allocUnsafe(sodium.crypto_sign_BYTES);
    sodium.crypto_sign_detached(
      signature,
      message,
      Buffer.from(this._keypair.secretKey, "hex")
    );

    // verify the signature matches the given public key
    return sodium.crypto_sign_verify_detached(
      signature,
      message,
      Buffer.from(this._keypair.publicKey, "hex")
    );
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

    const valid =
      msgs &&
      msgs.length > 0 &&
      msgs[0].value &&
      msgs[0].value.text &&
      this.verify(
        msgs[0].value.text + " " + msgs[0].value.timestamp,
        msgs[0].value.signature
      );

    return valid ? msgs[0].value.text : null;
  }

  verify(message, signature) {
    // verify(message, signature, publicKey) // verify the signature of this value matches the public key under which it was published
    return hcrypto.verify(
      Buffer.from(message, "utf8"),
      Buffer.from(signature, "hex"),
      Buffer.from(this._keypair.publicKey, "hex")
    );
  }
}

module.exports = HyPNS;

function getNewStorage() {
  if (isBrowser) return RAI("hypns");
  else return require("tmp").dirSync({ prefix: "hypns-" }).name;
}
