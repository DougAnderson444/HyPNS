![travis-ci-badge](https://travis-ci.com/DougAnderson444/HyPNS.svg?branch=main)
[![codecov](https://codecov.io/gh/DougAnderson444/HyPNS/branch/main/graph/badge.svg?token=IQ3DGMTFKU)](https://codecov.io/gh/DougAnderson444/HyPNS)

# HyPNS
Hypercore-protocol + IPNS = HyPNS

## Use

`npm install --save https://github.com/DougAnderson444/HyPNS`

## What?

HyPNS simply points a public key to some data, and pins that data. To get that data, simply resolve the publicKey using this library. It has multiwriter support baked in, so you can update the head/root from multiple devices as long as you have the crypto keypair.

## Why?

I thought when I published a value to IPNS that it stayed on the Distrubuted Hash Table permanently. I was wrong. It only stays published for 24 hours and then gets wiped. I need a naming system that publishes AND pins the value, and can be replicated by peers to be kept online. Hypercore-protocol is the answer to that.

## Solution

Hypercore-protocol has built in replication (pinning by peers) so it works for my use case. I just needed to implement what I thought IPNS did using Hypercores. Hence, HyPNS (pronouced Hi-Pee-eN-eSS, or High-Pins... which do you think sounds better?)

## Isomorphic

This package is tested for both the browser (using Browserify) and Node. 

If you want to use this is node, simply `import HyPNS from 'HyPNS'`

If you want to use this in the browser, either

- use the bundled code from `build:browserify`, or
- use  `import HyPNS from 'HyPNS'` in your own code and `Browserify` yourself there
- use a `HyPNS-Svelte-Component` in a Svelte project

# API

Take a public key and pin a signed mutable value to it

Generate a ed25519 keypair 
```js
// using hypercore crypto to generate public-private keypair
const hcrypto = require("hypercore-crypto");
const keypair = hcrypto.keyPair() 
// is Ed25519 keypair see: https://libsodium.gitbook.io/doc/public-key_cryptography/public-key_signatures
```

Pick the data you want to which you want publish and resolve:
```js
const data = {
    ipfs: "ipfs/QmCideeeeeeeeeeeeeeeeeeeeeeee",  // point to an ever changing ipfs root CID, just like IPNS
    feed: "abc123def456abc123def456abc123def456", // point to a hypercore feed if you like
    "Fave Colour": "Bleu" // even point to your favourite Canadian colour of the day
}
```

Publish that data to that Public Key using HyPNS:

```js
const HyPNS = require("hypns")
const opts = { persist: false } // use RAM (or disk)
const nameSys = new HyPNS(keypair, opts) // pass in options
nameSys.publish(data)
```
Those data are now available to be resolved from HyPNS
```js
const resolvedData = nameSys.resolve(keypair.publicKey.toString("hex"))
console.log(resolvedData) 
/*
{
    ipfs: "ipfs/QmCideeeeeeeeeeeeeeeeeeeeeeee",
    feed: "abc123def456abc123def456abc123def456", 
    "Fave Colour": "Bleu" 
}
*/ 
```