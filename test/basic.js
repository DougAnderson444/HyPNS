/* eslint-disable no-unused-expressions */
/* eslint-disable no-undef */
// import once from 'events.once'
const once = require('events.once') // polyfill for nodejs events.once in the browser

const chai = require('chai')
var chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
var expect = chai.expect

const HyPNS = require('../src')
const helper = require('./lib')

const mockPublicKey =
  'dee2fc9db57f409cfa5edea42aa40790f3c1b314e3630a04f25b75ad42b71835'
const mockPrivateKey =
  '1e9813baf16eb415a61a56693b037d5aec294279b35a814aff239a0c61f71d3bdee2fc9db57f409cfa5edea42aa40790f3c1b314e3630a04f25b75ad42b71835'
const mockKeypair = {
  publicKey: mockPublicKey,
  secretKey: mockPrivateKey
}
const mockObjPub = {
  text: 'Some test data to publish ' + new Date().toISOString(),
  type: 'chat-message',
  nickname: 'cat-lover'
}
const mockObjPub2 = {
  text: 'Some other test data to publish ' + new Date().toISOString(),
  type: 'chat-message',
  nickname: 'cat-lover'
}

process.on('warning', (warning) => {
  // console.warn(warning.name);    // Print the warning name
  // console.warn(warning.message); // Print the warning message
  // console.warn(warning.stack) // Print the stack trace
})

var myNode = new HyPNS({ persist: false }) // pass in optional Corestore and networker
var peerNode = new HyPNS({ persist: false }) // pass in optional Corestore and networker

var instance
var secondInstance
var readerOnly

describe('Tests', async function () {
  before(async function () {
    // runs once before the first test in this block
    instance = await myNode.open({ keypair: mockKeypair })
    await instance.ready()

    secondInstance = await peerNode.open({ keypair: { publicKey: instance.publicKey } })
    await secondInstance.ready()

    readerOnly = await myNode.open({ keypair: { publicKey: mockPublicKey } })
    await readerOnly.ready()
  })

  after(function (done) {
    // runs once after the last test in this block
    this.timeout(20000) // takes time to close all the connections
    myNode.close()
      .then(peerNode.close().then(done))
      .catch(err => console.error(err))
  })

  it('should create a HyPNS instance', async function () {
    expect(instance.publicKey).to.equal(mockPublicKey)
  })

  it('should start with empty latest value', function (done) {
    instance
      .readLatest()
      .catch((err) => console.error(err))
      .then((val) => {
        expect(val).to.equal(null)
        done()
      })
  })

  it('should be writeEnabled', function () {
    expect(instance.writeEnabled()).to.be.true
  })

  it('should publish and emit the same', async function () {
    const retVal = instance.publish(mockObjPub)
    expect(retVal.text).to.equal(mockObjPub.text)

    const [val] = await once(instance, 'update')
    expect(val.text).to.equal(mockObjPub.text)
    expect(val).to.have.property('signature')
  })

  it('should publish a second value and emit to remote', async function () {
    // secondInstance.once('update', (val) => {
    //   expect(val.text).to.equal(mockObjPub2.text)
    // })
    process.nextTick(() => {
      instance.publish(mockObjPub2)
    })
    this.timeout(5000) // sometimes this takes more than 2 seconds in the browser tests
    const [val] = await once(secondInstance, 'update')
    expect(val.text).to.equal(mockObjPub2.text)
  })

  it('should ignore entries without a timestamp, be same as last test publish()', function (done) {
    // saved from another library to this publicKey
    helper.anotherWriter(instance.core, () => {
      var totalEntries = 0
      instance.core.feeds().forEach((f) => {
        totalEntries += f.length
      })
      expect(totalEntries).to.equal(3)
      expect(instance.latest.text).to.equal(mockObjPub2.text)
      done()
    })
  })

  it('should be read only if only passed Public key and no private key', async function () {
    expect(readerOnly.writeEnabled()).to.be.false
    // need to wait until peers are confirmed as conencted before read
    this.timeout(1000)
    try {
      var val = await readerOnly.readLatest()
      expect(val).to.equal(mockObjPub2.text)
    } catch (error) {
      (error) => console.error(error)
    }
  })

  it('should ignore readonly publish command', function () {
    expect(() => readerOnly.publish({ text: 'foo' })).to.throw(TypeError, /not a function/)
  })

  it('should create new key if no public key is passed', async function () {
    const keyGen = await myNode.open()
    await keyGen.ready()
    expect(keyGen).to.have.property('publicKey')
  })

  it('should not be writeEnabled if bad secret key is passed', async function () {
    var badSecretKey = await myNode.open({
      keypair: { publicKey: mockPublicKey, secretKey: 'foo' }
    })
    await badSecretKey.ready()

    expect(badSecretKey.writeEnabled()).to.be.false
  })
})
describe('Persist:true', function () {
  var persistNode = new HyPNS({ persist: true }) // pass in optional Corestore and networker
  var persistH
  before(async function () {
    // runs once before the first test in this block
    persistH = await persistNode.open({ keypair: mockKeypair })
    await persistH.ready()
  })

  after(function (done) {
    // runs once after the last test in this block
    this.timeout(20000) // takes time to close all the connections
    persistNode
      .close()
      .then(done)
      .catch((err) => console.error(err))
  })
  it('should persist on disk', async function () {
    const mockOb = { text: 'saved data ' + new Date().toISOString() }
    persistH.publish(mockOb)
    this.timeout(3000)
    const [val] = await once(persistH, 'update')
    expect(val.text).to.equal(mockOb.text)
  })
})
// process.exit(1);
