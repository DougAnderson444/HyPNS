const path = require("path")

// This is a dirty hack for browserify to work. 😅
if (!path.posix) path.posix = path

const Corestore = require("corestore")
const SwarmNetworker = require("@corestore/networker")

const Multifeed = require("hypermultifeed")
const MultifeedNetworker = require("hypermultifeed/networker")

const kappa = require("kappa-core")
const list = require("@DougAnderson444/kappa-view-list")
const memdb = require("level-mem")

const RAM = require("random-access-memory")
const RAI = require("@DougAnderson444/random-access-idb")

const hcrypto = require("hypercore-crypto")
const sodium = require("sodium-universal")

const EventEmitter = require("events")

const utils = require("./utils.js")

const DEFAULT_APPLICATION_NAME = "hypnsapplication"
const DEFAULT_SWARM_OPTS = {
    extensions: [],
    preferredPort: 42666,
}

const isBrowser = process.title === "browser"

// workaround until RAA / random-access-web is fixed
function getNewStorage(name) {
    if (isBrowser) {
        // const name = Math.random().toString()
        return RAI(name)
    } else {
        return name // RAA(name)
    }
}

class HyPNS {
    constructor(opts = {}) {
        this.applicationName = opts.applicationName || DEFAULT_APPLICATION_NAME
        this._storage =
            opts.persist === false ? RAM : getNewStorage(this.applicationName)
        this.store =
            opts.corestore || new Corestore(this._storage, opts.corestoreOpts)
        this.instances = new Map()
        this.swarmOpts = opts.swarmOpts
        this.opts = { staticNoiseKey: opts.staticNoiseKey || false }
        this.initialized = false

        // handle shutdown gracefully
        const closeHandler = async () => {
            console.log("Shutting down...")
            await this.close()
            process.exit()
        }

        process.on("SIGINT", closeHandler)
        process.on("SIGTERM", closeHandler)
    }

    get corestore() {
        return new Promise((resolve) => {
            this.store.ready().then(resolve(this.store))
        })
    }

    async init() {
        if (this.initialized) return
        await this.store.ready()
        const swarmOpts = this.swarmOpts || {}
        if (this.opts.staticNoiseKey) {
            // Optionally Set up noiseKey to persist peer identity, just like in mauve's hyper-sdk
            const noiseSeed = this.store.inner._deriveSecret(
                this.applicationName,
                "replication-keypair"
            )
            const keyPair = {
                publicKey: Buffer.alloc(sodium.crypto_scalarmult_BYTES),
                secretKey: Buffer.alloc(sodium.crypto_scalarmult_SCALARBYTES),
            }
            sodium.crypto_kx_seed_keypair(
                keyPair.publicKey,
                keyPair.secretKey,
                noiseSeed
            )
            Object.assign(swarmOpts, { keyPair }, DEFAULT_SWARM_OPTS)
        }
        this.swarmNetworker = new SwarmNetworker(this.store, swarmOpts)
        this.swarmNetworker.listen()
        this.initialized = true
    }

    // open a new instance on this hypns node
    async open(opts) {
        if (!this.swarmNetworker) await this.init()

        if (!this.network)
            this.network = new MultifeedNetworker(this.swarmNetworker)

        // return if exists already on this node, and is not a writer (with a wallet opt)
        if (
            opts &&
            opts.keypair &&
            opts.keypair.publicKey &&
            this.instances.has(opts.keypair.publicKey) &&
            !opts.wallet // not opening a writer
        ) {
            return this.instances.get(opts.keypair.publicKey)
        }

        // if doesnt exist, return a new instance
        const instance = new HyPNSInstance({ ...opts, ...this })
        this.instances.set(instance.publicKey, instance)
        return this.instances.get(instance.publicKey)
    }

    async close() {
        // TODO: Close all instances too?
        this.store.close()
        if (this.swarmNetworker) await this.swarmNetworker.close() // Shut down the swarm networker.
    }

    async getDeviceSeed(nameSpace = "device-seed") {
        await this.store.ready()
        const noiseSeed = this.store.inner._deriveSecret(
            this.applicationName,
            nameSpace
        )
        return noiseSeed
    }

    async getKeypair(seed) {
        seed = seed || (await this.getDeviceSeed())
        const keyPair = {
            publicKey: Buffer.alloc(sodium.crypto_sign_PUBLICKEYBYTES),
            secretKey: Buffer.alloc(sodium.crypto_sign_SECRETKEYBYTES),
        }
        sodium.crypto_sign_seed_keypair(
            keyPair.publicKey,
            keyPair.secretKey,
            seed
        )
        return keyPair
    }

    async deriveKeypair(context, subkeyNumber, origSeed) {
        origSeed = origSeed || (await this.getDeviceSeed())
        const newSeed = Buffer.alloc(sodium.crypto_sign_SEEDBYTES)
        const ctx = Buffer.alloc(sodium.crypto_kdf_CONTEXTBYTES)
        ctx.write(context)
        sodium.crypto_kdf_derive_from_key(newSeed, subkeyNumber, ctx, origSeed)

        return this.getKeypair(newSeed)
    }
}

class HyPNSInstance extends EventEmitter {
    constructor(opts = {}) {
        super()
        if (
            !opts.keypair ||
            !opts.keypair.publicKey ||
            !opts.keypair.publicKey === null ||
            Buffer.byteLength(opts.keypair.publicKey, "hex") !==
                sodium.crypto_sign_PUBLICKEYBYTES
        ) {
            // make new keypair for them
            opts.keypair = hcrypto.keyPair()
        }

        if (opts.wallet) this.wallet = opts.wallet

        this._keypair = opts.keypair || {} // can be hex or buffer
        this.store = opts.temp
            ? new Corestore(RAM, opts.corestoreOpts)
            : opts.store
        this.network = opts.network
        this.latest = null
        this.writable = false
        this.publish = null
        this.setMaxListeners(0)
    }

    async ready() {
        return new Promise(async (resolve, reject) => {
            const self = this

            if (!!this.wallet) {
                // override what was previously set
                const pk = await this.wallet.getPublicKey()
                this._keypair.publicKey = Buffer.from(pk).toString("hex")
            }

            this.key = this._keypair.publicKey // hex

            this.multi = new Multifeed(this.store, {
                rootKey: this._keypair.publicKey, // hex
                valueEncoding: "json",
            })
            this.network.swarm(this.multi)

            this.multi.ready(async (err) => {
                if (err) throw Error("Multifeed not ready")

                this.core = kappa(this.store, { multifeed: this.multi }) // store not used since we pass in a multifeed

                const timestampView = list(memdb(), (msg, next) => {
                    // only index those msg with valid signature
                    const valid =
                        msg.value &&
                        msg.value.payload &&
                        msg.value.timestamp &&
                        typeof msg.value.timestamp === "string" &&
                        this.verify(
                            Buffer.from(
                                utils.hashIt(
                                    JSON.stringify(msg.value.payload) +
                                        "." +
                                        msg.value.timestamp
                                ),
                                "utf8"
                            ),
                            Buffer.from(msg.value.signature, "hex")
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
                this.core.use("pointer", timestampView)

                // perm listener
                this.core.api.pointer.tail(1, (msgs) => {
                    this.latest = msgs[0].value.payload
                    this.emit("update", msgs[0].value.payload)
                })

                // initial read, if pre-existing tail value
                this.readLatest = async (limit = 1) => {
                    return new Promise((resolve, reject) => {
                        if (!this.core?.api?.pointer) resolve(false)
                        this.core.api.pointer.read(
                            { limit, reverse: true },
                            (err, msgs) => {
                                if (err) console.error(err)
                                if (msgs.length > 0) {
                                    this.latest = msgs[0].value.payload
                                    resolve(msgs)
                                } else {
                                    resolve(false)
                                }
                            }
                        )
                    })
                }

                this.core.ready(async (err) => {
                    if (err) throw Error("Core not ready")

                    this.readLatest()

                    const writable = await this.writeEnabled()

                    if (writable) {
                        // writer
                        this.core.writer("kappa-local", async (err, feed) => {
                            if (err) reject(err)

                            async function pub(payload) {
                                const timestamp = new Date().toISOString()

                                const dataToSign = Buffer.from(
                                    utils.hashIt(
                                        JSON.stringify(payload) +
                                            "." +
                                            timestamp
                                    ),
                                    "utf8"
                                )

                                let signature

                                if (!!self.wallet) {
                                    signature = await self.wallet.ed25519.sign(
                                        dataToSign
                                    )
                                    signature = Buffer.from(signature)
                                } else {
                                    signature = hcrypto.sign(
                                        dataToSign,
                                        Buffer.from(
                                            self._keypair.secretKey,
                                            "hex"
                                        ) // has to be self.xxx so that .bind doesn't replace it with feed
                                    )
                                }
                                const objPub = {
                                    payload,
                                    signature: signature.toString("hex"),
                                    timestamp,
                                }
                                this.append(objPub) // this gets bound to the object's kappa-local feed above
                                return objPub
                            }

                            this.publish = await pub.bind(feed) // bind feed to this in pub()

                            feed.ready(() => {
                                this.writable = true
                                resolve(this)
                            })
                        })
                    } else {
                        resolve(this)
                    }
                })
            })
        })
    }

    async close() {
        this.multi.close() // closes individual multifeed
    }

    async writeEnabled() {
        const message = Buffer.from("any msg will do", "utf8")

        let signature

        // TODO: assert proper wallet features, publicKey and signing ability
        if (this.wallet) {
            const pk = await this.wallet.getPublicKey()
            return !!pk
        } else {
            // legacy keypair use

            if (
                !this._keypair.secretKey ||
                Buffer.byteLength(this._keypair.secretKey, "hex") !==
                    sodium.crypto_sign_SECRETKEYBYTES
            ) {
                return false
            }

            // sign something with this secretKey
            signature = Buffer.allocUnsafe(sodium.crypto_sign_BYTES)
            sodium.crypto_sign_detached(
                signature,
                message,
                Buffer.from(this._keypair.secretKey, "hex")
            )
        }

        // verify the signature matches the given public key
        return sodium.crypto_sign_verify_detached(
            signature,
            message,
            Buffer.from(this._keypair.publicKey, "hex")
        )
    }

    get publicKey() {
        return this._keypair.publicKey
    }

    verify(message, signature) {
        return hcrypto.verify(
            message,
            signature,
            Buffer.from(this._keypair.publicKey, "hex")
        )
    }
}

module.exports = HyPNS
