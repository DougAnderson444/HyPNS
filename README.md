![travis-ci-badge](https://travis-ci.com/DougAnderson444/HyPNS.svg?branch=main)
[![codecov](https://codecov.io/gh/DougAnderson444/HyPNS/branch/main/graph/badge.svg?token=IQ3DGMTFKU)](https://codecov.io/gh/DougAnderson444/HyPNS)
[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2FDougAnderson444%2FHyPNS.svg?type=shield)](https://app.fossa.com/projects/git%2Bgithub.com%2FDougAnderson444%2FHyPNS?ref=badge_shield)

# HyPNS
[Hypercore-protocol](https://hypercore-protocol.org/) + [IPNS](https://docs.ipfs.io/concepts/ipns/) = HyPNS

A library to post and pin data on Web 3.0

What's unique?

✔️🥇 No Tokens! No cryptocurrency!

✔️💰 Zero Fees!  

✔️💻 Use your OWN hardware! 

✔️🗃️ Conveniently Control Your Data 

## Status

It works, but also is in active pre-alpha development, API may change. Feel free to help out if you like :)

## Use

> npm install --save hypns

or

> npm install --save https://github.com/DougAnderson444/HyPNS

## What?

HyPNS simply points a public key to some data, and pins that data. To get that data, simply resolve the publicKey using this library. To publish data, sign it with the private key and publish to HyPNS. Under the hood it uses hyper://protocol. It has multiwriter support baked in, so you can update the head/root from multiple devices as long as you have the crypto keypair.

## Why?

I originally thought when I published a value to [IPNS](https://docs.ipfs.io/concepts/ipns/) that it stayed on the IPFS Distrubuted Hash Table (DHT) permanently. **I was wrong**. It [only stays published for 24 hours and then gets wiped](https://discuss.ipfs.io/t/confusion-about-ipns/1414). Which defeated my purpose of "post and leave" I was targeting. I didn't want to keep a server up and running re-publishing the same value all the time. I need a naming system that publishes *AND* pins the value, *AND* can be replicated by peers to be kept online. Hypercore-protocol is the answer to that.

## Solution

Hypercore-protocol has built in replication and pinning by peers so it works great for this use case. I just needed to implement what I thought IPNS did using Hypercores. Hence, HyPNS (pronouced Hi-Pee-eN-eSS, or High-Pins... which do you think sounds better?).

This library signs the data with the secretKey then publishes that data under the discoveryKey/topic of the public key. Same idea as IPNS, only persistent.

## Isomorphic

This package is tested for both the browser (using Browserify) and Node. 

If you want to use this is node, simply 
> `const hypns = require('hypns')`

If you want to use this in the browser, either

- use the bundled code from `build:browserify` in `package.json`, or
- use  `import HyPNS from 'HyPNS'` in your own code and `Browserify` yourself there
- use [`HyPNS-Svelte-Component`](https://github.com/DougAnderson444/HyPNS-Svelte-Component) in a Svelte project (*** Recommended, takes care of open/close for you)

# API

Also see the `basic tests` for latest on how to use the API.

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
const myNode = new HyPNS(opts) // create a node, pass in options
const instance = await myNode.open() // open a new instance. Makes a new keyPair for you if no options passed in
await instance.ready() // let it configure first 
instance.publish({ text: "Doug's favorite colour is blue" })
instance.publicKey // a 64-char hex string dee2fc9db57f409cfa5edea42aa40790f3c1b314e3630a04f25b75ad42b71835
console.log(instance.latest) // { text: "Doug's favorite colour is blue" }

// Share data with friends

// on another machine...
var peerNode = new HyPNS({ persist: false }) // pass in optional Corestore and networker
// make a local copy
copy = await peerNode.open({ keypair: { publicKey: "dee2fc9db57f409cfa5edea42aa40790f3c1b314e3630a04f25b75ad42b71835" } }) // enter friend's public key. No secretKey = Read Only for my copy
await copy.ready() // wait for it...

// get latest
copy.latest // { text: "Doug's favorite colour is blue" }

// should update you whenever the other guy publishes an updated value 
copy.on('update', (val) => {
    console.log(val) // { text: "Doug's favorite colour is now red" }
})

// update data from another machine
const keypair = { publicKey, secretKey }
authorizedWriter = await peerNode.open({ keypair }) // enter your keypair
await authorizedWriter.ready() // now you can update your feed from this machine too, since you opened this node including the secretKey

authorizedWriter.publish({ text: "Doug's favorite colour is now mauve" })

// Get all the HyPNS peer instances to which this node is currently connected
// does not persist across restarts, so might want to track the list of peers in a db
const peerMap = myNode.instances // a javascript Map of all instances this node is connected to
for (let peer of peerMap) { // the same as of recipeMap.entries()
  console.log(peer); // (instancePublicKey, instanceObject)  (and so on)
}


```

If you really want to get your hands dirty, the node networking can be accessed too:

```js
// swarmNetworker is a corestore/networker
// swarm is a hypwerswarm / hyperswarm-web 
hypnsNode.swarmNetworker.swarm.on('connection', (socket, info) => {
  console.log('node Connection added')
  info.stream.on('data', (data) => console.log('stream data'))
  socket.on('data', (data) => console.log('socket data'))
})

// networker is also a corestore/networker, same one as above
hypnsInstance.network.networker.on('peer-add', (peer) => {
  console.log('peer added ', { remotePublicKey: peer.remotePublicKey.toString('hex') })
  peer.stream.on('data', (data) => console.log('peer stream data'))
})
```

# Wine-Pairing

Used in [HyPNS-Svelte-Component](https://github.com/DougAnderson444/HyPNS-Svelte-Component) for Svelte Apps. 

Will also go great with [`js-did-hypns`](https://github.com/DougAnderson444/js-did-hypns) to publish [Decentralized Identifiers](https://www.w3.org/TR/did-core/Overview.html) from your home computer without the need for any blockchain to anchor it. 

Goes great with [IPFS](https://ipfs.io/) since now you can publish, pin, and propogate all your IPFS data by saving the root [CID](https://cid.ipfs.io/) to HyPNS and HyPNS will update all the peers holding that PublicKey that HyPNS uses.  

```js

instance.publish({ root: ipfsRootCID })

```
# Build

To use in the browser, a build step is required to compile the nodejs code into browser-readable code.

To do this, `package.json` uses a build step with `Browserify` to convert this code into `umd` standalone bundle, `/browser/hypns-bundle.js`.

This `/browser/hypns-bundle.js` bundle can then be used elsewhere, like

A) Option A
```
import HyPNS from "HyPNS/browser/hypns-bundle"
```

Option A is used in [HyPNS-Svelte-Component](https://github.com/DougAnderson444/HyPNS-Svelte-Component) to bring this bundle in and wrap it in an open/close handler for using in Svelte apps.

B) Option B
```
<script src='hypns-bundle.js'></script> 
const HyPNS = window.hypns
```

### Bundlers

Note: Rollup and webpack were actually bigger than the browserify build. If you can make it smaller, I welcomeany PRs! Esbuild perhaps?

## License
[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2FDougAnderson444%2FHyPNS.svg?type=large)](https://app.fossa.com/projects/git%2Bgithub.com%2FDougAnderson444%2FHyPNS?ref=badge_large)