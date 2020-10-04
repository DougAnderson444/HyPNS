![travis-ci-badge](https://travis-ci.com/DougAnderson444/HyPNS.svg?branch=main)
[![codecov](https://codecov.io/gh/DougAnderson444/HyPNS/branch/main/graph/badge.svg?token=IQ3DGMTFKU)](undefined)

# HyPNS
Hypercore-protocol + IPNS = HyPNS

## What?

HyPNS simply points a public key to some data, and pins that data. To get that data, simply resolve the publicKey using this library. It has multiwriter support baked in, so you can update the head/root from multiple devices as long as you have the crypto keypair.

## Why?

I thought when I published a value to IPNS that it stayed on the Distrubuted Hash Table permanently. I was wrong. It only stays published for 24 hours and then gets wiped. I need a naming system that publishes AND pins the value, and can be replicated by peers to be kept online.

## Solution

Hypercore-protocol has built in replication (pinning by peers) so it works for my use case. I just needed to implement what I thought IPNS did using Hypercores. Hence, HyPNS (pronouced Hi-Pee-eN-eSS, or High-Pins... which do you think sounds better?)

# API

Take a public key and pin a signed mutable value to it

Generate a ed25519 keypair 
```js
// using sodium library
const sodium = require('sodium-universal')
const seedSodium = Buffer.allocUnsafe(sodium.crypto_hash_sha256_BYTES)
sodium.crypto_hash_sha256(seedSodium, Buffer.from(seedPhrase))
console.log(`seed is`, seedSodium.toString("hex"))

// hypercore crypto makes using sodium a bit easier
const hcrypto = require("hypercore-crypto");
const keypair = hcrypto.keyPair(seedSodium) 
// is Ed25519 keypair see: https://libsodium.gitbook.io/doc/public-key_cryptography/public-key_signatures
```

The data you want to which you want resolve:
```js
const pointers = {
    ipfs: "ipfs/QmCideeeeeeeeeeeeeeeeeeeeeeee",  // point to an ever changing ipfs root CID, just like IPNS
    feed: "abc123def456abc123def456abc123def456", // point to a hypercore feed if you like
    "Fave Colour": "Bleu" // evenr point to your favourite colour of the day, spelled the Canadian way
}
```

Publish pointer(s) to HyPNS:

```js
const HyPNS = require("hypns")
const opts = { corestore, networker, persist }
const ns = new HyPNS(keypair, opts) // pass in optional Corestore and networker
ns.publish(pointers)
```
Those pointers are now available at

> ```hyper://{keypair.publicKey.toString("hex")}```

Resolve pointers from a HyPNS
```js
const resolvedData = ns.resolve(keypair.publicKey.toString("hex"))
console.log(resolvedData) 
/*
{
    ipfs: "ipfs/QmCideeeeeeeeeeeeeeeeeeeeeeee",
    feed: "abc123def456abc123def456abc123def456", 
    "Fave Colour": "Bleu" 
}
*/ 
```