const { expect, assert } = require("chai");

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
  text: "Some test data to publish " + new Date().toISOString(),
  type: "chat-message",
  nickname: "cat-lover",
};
const mockObjPub2 = {
  text: "Some other test data to publish " + new Date().toISOString(),
  type: "chat-message",
  nickname: "cat-lover",
};

describe("Writer", async function () {
  const opts = { persist: false };
  var nameSys = new HyPNS(mockKeypair, opts); // pass in optional Corestore and networker

  it("should create a HyPNS instance, ok?", async function () {
    await nameSys.ready;
    expect(nameSys.publicKey).to.equal(mockPublicKey);
    const latest = await nameSys.read();
    expect(latest).to.equal(null);
  });

  it("should be writable", async function () {
    assert.isTrue(nameSys.writable());
  });

  it("should publish and emit the same", async function () {
    const retVal = nameSys.publish(mockObjPub);
    const [val] = await once(nameSys.latest, "update");
    expect(retVal.text).to.equal(mockObjPub.text);
    expect(val.text).to.equal(mockObjPub.text);
  });

  it("should publish a second value and emit the same", async function () {
    const retVal = nameSys.publish(mockObjPub2);
    const [val] = await once(nameSys.latest, "update");
    expect(retVal.text).to.equal(mockObjPub2.text);
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

describe("Errors", async function () {
  it("should throw Err if no public key is passed", async function () {
    expect(() => {
      new HyPNS({}, { persist: false });
    }).to.throw();
  });

  it("should not be writable if bad secret key is passed", async function () {
    const badSecretKey = new HyPNS(
      { publicKey: mockPublicKey, secretKey: "foo" },
      { persist: false }
    );
    assert.isFalse(badSecretKey.writable());
  });
});

describe("Reader", async function () {
  it("should be read only if only passed Public key and no private key", async function () {
    const readerOnly = new HyPNS({ publicKey: mockPublicKey }, { persist: false });
    assert.isFalse(readerOnly.writable());
  });
});

describe("Storage", async function () {
  const opts = { persist: true };
  var persistH = new HyPNS(mockKeypair, opts); // pass in optional Corestore and networker

  it("should persist in tmp dir", async function () {
    await persistH.ready;

    const retVal = persistH.publish(mockObjPub);
    const [val] = await once(persistH.latest, "update");

    expect(retVal.text).to.equal(mockObjPub.text);
    expect(val.text).to.equal(mockObjPub.text);

    // TODO: test whether the file made it to the 'tmp' directory
  });
});
//process.exit(1);
