var chai = require("chai");

var assert = require("assert");
const { expect } = require("chai");

const HyPNS = require("../src");
const once = require("events.once"); // polyfill for nodejs events.once in the browser

const helper = require("./lib");

const mockPublicKey =
  "dee2fc9db57f409cfa5edea42aa40790f3c1b314e3630a04f25b75ad42b71835";
const mockPrivateKey =
  "1e9813baf16eb415a61a56693b037d5aec294279b35a814aff239a0c61f71d3bdee2fc9db57f409cfa5edea42aa40790f3c1b314e3630a04f25b75ad42b71835";
const mockKeypair = {
  publicKey: mockPublicKey,
  secretKey: mockPrivateKey,
};
const mockObjPub = {
  text: "Some test data to publish" + new Date().toISOString(),
  type: "chat-message",
  nickname: "cat-lover",
};
const mockObjPub2 = {
  text: "Some test data to publish " + new Date().toISOString(),
  type: "chat-message",
  nickname: "cat-lover",
};

describe("Basic", function () {
  //arrange
  const opts = { persist: false };
  //act
  const nameSys = new HyPNS(mockKeypair, opts); // pass in optional Corestore and networker

  it("should create a HyPNS instance", function () {
    //assert
    expect(nameSys.publicKey).to.equal(mockPublicKey);
    expect(nameSys.latest).to.equal(null);
  });

  it("should publish after ready", function () {
    nameSys.ready(async () => {
      const retVal = await nameSys.publish(mockObjPub);
      //assert
      expect(retVal.text).to.equal(mockObjPub.text);
    });
  });

  it("should publish a second value", async function () {
    const retVal = await nameSys.publish(mockObjPub2);
    //assert
    expect(retVal.text).to.equal(mockObjPub2.text);
  });

  it("should emit the latest value", async function () {
    const [val] = await once(nameSys.latest, "update");
    //assert
    expect(val.text).to.equal(mockObjPub2.text);
  });

  it("should ignore entries without a timestamp", async function () {
    expect(nameSys.core.feeds().length).to.equal(1);
    // saved from another library to this publicKey
    helper.anotherWriter(nameSys.core, async () => {
      expect(nameSys.core.feeds().length).to.equal(2);
      var totalEntries = 0;
      nameSys.core.feeds().forEach((f) => {
        totalEntries += f.length;
      });
      expect(totalEntries).to.equal(3);
      const latest = await nameSys.read();
      expect(latest).to.equal(mockObjPub2.text);
    });
  });
});

//process.exit(1);
