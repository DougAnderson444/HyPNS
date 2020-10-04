const Corestore = require("corestore");
const SwarmNetworker = require("@corestore/networker");

const Multifeed = require("hypermultifeed");
const MultifeedNetworker = require("hypermultifeed/networker");

var kappa = require("kappa-core");
var list = require("@DougAnderson444/kappa-view-list");
var memdb = require("level-mem");

var RAM = require("random-access-memory");

module.exports = { appendNoTimeStamp, anotherWriter };

function appendNoTimeStamp(rootKey, cb) {
  const store = new Corestore(RAM);
  const swarmNetworker = new SwarmNetworker(store);
  var network = new MultifeedNetworker(swarmNetworker); // multi + network = swarm

  var multi = new Multifeed(store, {
    rootKey,
    valueEncoding: "json",
  });
  network.swarm(multi);

  var mockView = list(memdb(), function (msg, next) {});

  var core = kappa(store, { multifeed: multi }); // store not used since we pass in a multifeed
  core.use("pointer", mockView);
  core.ready("pointer", () => {
    core.writer("kappa-local", function (err, feed) {
      if (err) console.error(err);

      feed.ready(() => {
        let objPub = {
          text: "text without a timestamp",
        };
        feed.append(objPub, () => {
          cb();
        });
      });
    });
  });
}

function anotherWriter(core, cb) {
  core.writer("another-writer", function (err, feed) {
    if (err) throw err;

    feed.ready(() => {
      let objPub = {
        text: "text without a timestamp",
      };
      feed.append(objPub, () => {
        cb();
      });
    });
  });
}
