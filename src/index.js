const path = require('path')

// This is a dirty hack for browserify/rollup to work. 😅
if (!path.posix) path.posix = path

const Corestore = require('corestore')
const SwarmNetworker = require('@corestore/networker')

const Multifeed = require('hypermultifeed')
const MultifeedNetworker = require('hypermultifeed/networker')

var kappa = require('kappa-core')
var list = require('@DougAnderson444/kappa-view-list')
var memdb = require('level-mem')

const RAM = require('random-access-memory')
const RAI = require('@DougAnderson444/random-access-idb')

const hcrypto = require('hypercore-crypto')
const sodium = require('sodium-universal')

const EventEmitter = require('events')

const DEFAULT_APPLICATION_NAME = 'hypnsapplication'

const isBrowser = process.title === 'browser'

// workaround until RAA / random-access-web is fixed
function getNewStorage (name) {
  if (isBrowser) {
    // const name = Math.random().toString()
    return RAI(name)
  } else {
    return name // RAA(name)
  }
}

class HyPNS {
  constructor (opts) {
    const applicationName = opts.applicationName || DEFAULT_APPLICATION_NAME
    this._storage =
      opts.persist === false ? RAM : getNewStorage(applicationName)
    this.store = new Corestore(this._storage, opts.corestoreOpts)
    this.sodium = sodium
    this.hcrypto = hcrypto
    this.swarmNetworker
    this.network

    // handle shutdown gracefully
    const closeHandler = async () => {
      console.log('Shutting down...')
      await this.close()
      process.exit()
    }

    process.on('SIGINT', closeHandler)
    process.on('SIGTERM', closeHandler)
  }

  async open (opts) {
    await this.store.ready()
    if (!this.swarmNetworker) this.swarmNetworker = new SwarmNetworker(this.store)
    if (!this.network) this.network = new MultifeedNetworker(this.swarmNetworker)
    return new HyPNSInstance({ ...opts, ...this }) // TODO: Keep track of these to close them all? Does it matter?
  }

  async close () {
    // TODO: Close all instances too
    this.store.close()
    if (this.swarmNetworker) await this.swarmNetworker.close() // Shut down the swarm networker.
  }
}

class HyPNSInstance extends EventEmitter {
  constructor (opts) {
    super()
    if (
      !opts.keypair ||
      !opts.keypair.publicKey ||
      !opts.keypair.publicKey === null ||
      Buffer.byteLength(opts.keypair.publicKey, 'hex') !==
      sodium.crypto_sign_PUBLICKEYBYTES
    ) {
      // make new keypair for them
      opts.keypair = hcrypto.keyPair()
    }
    this._keypair = opts.keypair
    this.key = this._keypair.publicKey
    // this.publicKey = this._keypair.publicKey.toString('hex')
    this.store = opts.store
    this.network = opts.network
    // this.beacon = new EventEmitter()
    // eslint-disable-next-line no-unused-expressions
    this.multi
    this.core
    this.latest = null
    this.writable = false
    this.publish
  }

  async ready () {
    return new Promise((resolve, reject) => {
      var self = this

      this.multi = new Multifeed(this.store, {
        rootKey: this._keypair.publicKey,
        valueEncoding: 'json'
      })
      this.network.swarm(this.multi)

      this.multi.ready(async (err) => {
        if (err) throw Error('Multifeed not ready')

        this.core = kappa(this.store, { multifeed: this.multi }) // store not used since we pass in a multifeed

        var timestampView = list(memdb(), (msg, next) => {
          // only index those msg with valid signature
          const valid =
            msg.value &&
            msg.value.text &&
            msg.value.timestamp &&
            typeof msg.value.timestamp === 'string' &&
            this.verify(
              msg.value.text + ' ' + msg.value.timestamp,
              msg.value.signature
            )

          if (valid) {
            // sort on the 'timestamp' field
            next(null, [msg.value.timestamp])
          } else {
            next()
          }
        })

        /**
         * If there are pre-exisitng hypercore feeds in storage,
         * then wait for that feed to be ready so it can be indexed
         * by the kappa view
         */
        if (this.core.feeds().length > 0) {
          await new Promise((resolve, reject) => {
            // TODO: multiple pre-existing feeds, foreach
            this.core.feeds()[0].ready(() => {
              resolve()
            })
          })
        }
        this.core.use('pointer', timestampView)

        this.core.ready(async (err) => {
          if (err) throw Error('Core not ready')

          // perm listener
          this.core.api.pointer.tail(1, (msgs) => {
            // console.log('tail updated', msgs[0].value)
            this.latest = msgs[0].value
            this.emit('update', msgs[0].value)
          })

          // initial read, if pre-existing tail value
          this.readLatest = async () => {
            return new Promise((resolve, reject) => {
              this.core.api.pointer.read({ limit: 1, reverse: true }, (err, msgs) => {
                if (err) console.error(err)
                if (msgs.length > 0) {
                  this.latest = msgs[0].value
                  // console.log('readLatest: ', this.latest)
                  resolve(msgs[0].value)
                } else {
                  // console.log('no tail msgs, resolve false')
                  resolve(false)
                }
              })
            })
          }

          await this.readLatest()

          if (this.writeEnabled()) {
          // writer
            this.core.writer('kappa-local', (err, feed) => {
              if (err) reject(err)

              function pub (data) {
                const timestamp = new Date().toISOString()
                const signature = hcrypto.sign(
                  Buffer.from(data.text + ' ' + timestamp, 'utf8'),
                  Buffer.from(self._keypair.secretKey, 'hex') // has to be self._ so that .bind doesn't replace it with feed
                )
                const objPub = {
                  ...data,
                  signature: signature.toString('hex'),
                  timestamp
                }
                this.append(objPub) // this gets bound to the object's kappa-local feed above
                return objPub
              }

              this.publish = pub.bind(feed) // bind feed to this in pub()

              feed.ready(() => {
                this.writable = true
                resolve(feed)
              })
            })
          } else {
            resolve(this.core)
          }
        })
      })
    })
  }

  async close () {
    this.multi.close() // closes individual multifeed
  }

  writeEnabled () {
    if (!this._keypair.secretKey) return false
    if (
      Buffer.byteLength(this._keypair.secretKey, 'hex') !==
      sodium.crypto_sign_SECRETKEYBYTES
    ) { return false }

    const message = Buffer.from('any msg will do', 'utf8')

    // sign something with this secretKey
    const signature = Buffer.allocUnsafe(sodium.crypto_sign_BYTES)
    sodium.crypto_sign_detached(
      signature,
      message,
      Buffer.from(this._keypair.secretKey, 'hex')
    )

    // verify the signature matches the given public key
    return sodium.crypto_sign_verify_detached(
      signature,
      message,
      Buffer.from(this._keypair.publicKey, 'hex')
    )
  }

  get publicKey () {
    return this._keypair.publicKey.toString('hex')
  }

  verify (message, signature) {
    // verify(message, signature, publicKey) // verify the signature of this value matches the public key under which it was published
    return hcrypto.verify(
      Buffer.from(message, 'utf8'),
      Buffer.from(signature, 'hex'),
      Buffer.from(this._keypair.publicKey, 'hex')
    )
  }
}

module.exports = HyPNS
