# Change Log

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