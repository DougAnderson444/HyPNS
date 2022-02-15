// /* eslint-disable no-unused-expressions */
// const sodium = require('sodium-universal')
// const utils = require('../src/utils.js')
// const chai = require('chai')
// const chaiAsPromised = require('chai-as-promised')
// chai.use(chaiAsPromised)
// const expect = chai.expect

// // Generate a keypair
// const keyPair = {
//   publicKey: Buffer.alloc(sodium.crypto_sign_PUBLICKEYBYTES),
//   secretKey: Buffer.alloc(sodium.crypto_sign_SECRETKEYBYTES)
// }
// sodium.crypto_sign_keypair(keyPair.publicKey, keyPair.secretKey)
// console.log('Sodium keypair:\n', { keyPair })

// // describe('JWS Tests', async function () {
// //   it('should sign and verify signatures',
// ;(async function () {
//   const data = { test: 'value' }
//   const timestamp = new Date().toISOString()
//   const objPub = {
//     ...data,
//     timestamp
//   }

//   const compactJWS = await utils.getCompactJWS(objPub, keyPair.secretKey)

//   // should verify to the same
//   const publicKeyJwk = utils.publicKeyJwkFromPublicKey(keyPair.publicKey)
//   console.log({ compactJWS })
//   console.log({ publicKeyJwk })
//   const payload = await utils.validatePayload(compactJWS, publicKeyJwk)
//   const valid = (payload &&
//             payload.timestamp &&
//             typeof payload.timestamp === 'string')

//   console.log(valid === true)
//   console.log(JSON.stringify(payload, null, 2))
//   //   expect(payload).to.deep.equal(objPub)

//   const jws = 'eyJhbGciOiJFZERTQSJ9.eyJ0ZXh0IjoiU29tZSB0ZXN0IGRhdGEgdG8gcHVibGlzaCAyMDIxLTAyLTI2VDIwOjIyOjU4LjQ4NVoiLCJ0eXBlIjoiY2hhdC1tZXNzYWdlIiwibmlja25hbWUiOiJjYXQtbG92ZXIiLCJ0aW1lc3RhbXAiOiIyMDIxLTAyLTI2VDIwOjIyOjU4LjczNFoifQ.ZL2ZvOUTIewdx5YOi2j1afObuAqgEnqgvpMuv-rE3blEs-csmcfitDpn8FAFNkEIO2289aDbYjVsfkFlHTVGDQ'
//   const testpublicKeyJwk = {
//     crv: 'Ed25519',
//     x: 'd7OdzLrvBz73jHi_oRG9kM7JbMII7-mFmE7vhMRn5_s',
//     kty: 'OKP',
//     kid: 'PK96zXtYjHZaWjltwCcX_CFdHkJnyFTQ7-JvRNeZW5k'
//   }
//   const pl = await utils.validatePayload(jws, testpublicKeyJwk)
//   console.log({ pl })
// })()
