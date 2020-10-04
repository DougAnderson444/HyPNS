var chai = require("chai");

var assert = require("assert");

const HyPNS = require("../src");
const { expect } = require("chai");

const mockPublicKey =
  "dee2fc9db57f409cfa5edea42aa40790f3c1b314e3630a04f25b75ad42b71835";
const mockPrivateKey =
  "1e9813baf16eb415a61a56693b037d5aec294279b35a814aff239a0c61f71d3bdee2fc9db57f409cfa5edea42aa40790f3c1b314e3630a04f25b75ad42b71835";
const mockKeypair = {
  publicKey: mockPublicKey,
  secretKey: mockPrivateKey,
};
const mockObjPub = {
  text: "Some test data to publish",
  type: "chat-message",
  nickname: "cat-lover",
};

describe("HyPNS", function () {
  describe("#indexOf()", function () {
    it("should return -1 when the value is not present", function () {
      assert.strictEqual([1, 2, 3].indexOf(4), -1);
    });
  });

  describe("constructor", function () {
    it("should create a HyPNS instance", function () {
      //arrange
      const opts = { persist: false };
      //act
      const nameSys = new HyPNS(mockKeypair, opts); // pass in optional Corestore and networker
      //assert
      expect(nameSys.publicKey).to.equal(mockPublicKey);
      expect(nameSys.latest).to.equal(null);
    });
  });

  describe("methods", function () {
    it("should publish to feed", function () {
      //arrange
      const opts = { persist: false };
      //act
      const nameSys = new HyPNS(mockKeypair, opts); // pass in optional Corestore and networker
      nameSys.ready(() => {
        const retVal = nameSys.publish(mockObjPub);
        //assert
        expect(retVal.text).to.equal(mockObjPub.text);
      });
    });
  });
});

//process.exit(1);
