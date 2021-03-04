const sodium = require('sodium-universal')

module.exports.hashIt = function (data) {
  const dataBuffer = Buffer.from(data)
  const hash = Buffer.allocUnsafe(sodium.crypto_generichash_BYTES)
  sodium.crypto_generichash(hash, dataBuffer)
  return hash
}
