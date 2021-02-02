# Change Log

List of major changes below.
## v 1.6.8

Expose init function to enable networker access before first instance is opened, so that the hyperswarm can be used by other functions (such as hyperswarm-web)

## v 1.6.7

Expose the devices corestore

## v 1.6.4

Expose the device master key and the ability to generate master keypair and subkeys for this device. Useful if you want to link an identity to this device. 

## v 1.6.1

Add swarm options for hypwerswarm-web-proxy

## v 1.6.0

Add Noise Protocol to persist peer identity

## v 1.5.6

Hypns now keeps track of all the open instances on a node, and can be accessed through

```js
myNode.instances // Map() that holds all the open publicKey instances on this node
const instance = myNode.instances.get(publicKey)
myNode.instances.keys()  // all publicKeys being Hypnned
myNode.instances.values() // all open instances
myNode.instances.size() // number of open instances
```