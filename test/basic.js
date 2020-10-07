const chai = require("chai");
var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
var expect = chai.expect;

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

  before(async function () {
    // runs once before the first test in this block
    await nameSys.ready;
  });

  after(function (done) {
    // runs once after the last test in this block
    this.timeout(30000); // takes time to close all the connections
    nameSys
      .close()
      .catch((err) => console.error(err))
      .then(done);
  });

  it("should create a HyPNS instance", async function () {
    expect(nameSys.publicKey).to.equal(mockPublicKey);
  });

  it("should start with empty latest value", function (done) {
    nameSys
      .read()
      .catch((err) => console.error(err))
      .then((val) => {
        expect(val).to.equal(null);
        done();
      });
  });

  it("should be writable", async function () {
    expect(nameSys.writable()).to.be.true;
  });

  it("should publish and emit the same", async function () {
    const retVal = nameSys.publish(mockObjPub);
    expect(retVal.text).to.equal(mockObjPub.text);

    const [val] = await once(nameSys.latest, "update");
    expect(val.text).to.equal(mockObjPub.text);
    expect(val).to.have.property("signature");
  });

  it("should publish a second value and emit the same", async function () {
    const retVal = nameSys.publish(mockObjPub2);
    const [val] = await once(nameSys.latest, "update");
    expect(retVal.text).to.equal(mockObjPub2.text);
    expect(val.text).to.equal(mockObjPub2.text);
  });

  it("should ignore entries without a timestamp", function (done) {
    expect(nameSys.core.feeds().length).to.equal(1);
    // saved from another library to this publicKey
    helper.anotherWriter(nameSys.core, async () => {
      expect(nameSys.core.feeds().length).to.equal(2);
      var totalEntries = 0;
      nameSys.core.feeds().forEach((f) => {
        totalEntries += f.length;
      });
      expect(totalEntries).to.equal(3);

      nameSys
        .read()
        .catch((err) => console.error(err))
        .then((val) => {
          expect(val).to.equal(mockObjPub2.text);
          done();
        });
    });
  });

  describe("Reader", function () {
    var readerOnly = new HyPNS(
      { publicKey: mockPublicKey },
      { persist: false }
    );

    it("should be read only if only passed Public key and no private key", function (done) {
      readerOnly.ready
        .catch((err) => console.error(err))
        .then(async () => {
          expect(readerOnly.writable()).to.be.false;
          // need to wait until peers are confirmed as conencted before read
          this.timeout(1000);
          var val;
          try {
            val = await readerOnly.read();
            expect(val).to.equal(mockObjPub2.text);
            done();
          } catch (error) {
            (error) => console.error(error);
            done();
          }
        });
    });

    it("should ignore readonly publish command", function () {
      expect(readerOnly.publish({ text: "foo" })).to.equal(null);
    });
  });
});

describe("Errors", function () {
  it("should throw Err if no public key is passed", async function () {
    expect(() => {
      new HyPNS({}, { persist: false });
    }).to.throw();
  });

  it("should not be writable if bad secret key is passed", function (done) {
    var badSecretKey = new HyPNS(
      { publicKey: mockPublicKey, secretKey: "foo" },
      { persist: false }
    );
    badSecretKey.ready
      .catch((err) => console.error(err))
      .then(() => {
        expect(badSecretKey.writable()).to.be.false;
        done();
      });
  });
});

describe("Storage", function () {
  it("should persist in tmp dir", function (done) {
    var persistH = new HyPNS(mockKeypair, { persist: true }); // pass in optional Corestore and networker

    persistH.ready
      .catch((err) => console.error(err))
      .then(async () => {
        let mockOb = { text: "saved data " + new Date().toISOString() };
        persistH.publish(mockOb);
        const [val] = await once(persistH.latest, "update");
        expect(val.text).to.equal(mockOb.text);
        done();
      });
  });
});
//process.exit(1);
