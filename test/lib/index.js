const Corestore = require('corestore')
const SwarmNetworker = require('@corestore/networker')

const Multifeed = require('hypermultifeed')
const MultifeedNetworker = require('hypermultifeed/networker')

const kappa = require('kappa-core')
const list = require('@DougAnderson444/kappa-view-list')
const memdb = require('level-mem')

const RAM = require('random-access-memory')

module.exports = { appendNoTimeStamp, anotherWriter }

function appendNoTimeStamp (rootKey, cb) {
  const store = new Corestore(RAM)
  const swarmNetworker = new SwarmNetworker(store)
  const network = new MultifeedNetworker(swarmNetworker) // multi + network = swarm

  const multi = new Multifeed(store, {
    rootKey,
    valueEncoding: 'json'
  })
  network.swarm(multi)

  const mockView = list(memdb(), function (msg, next) {})

  const core = kappa(store, { multifeed: multi }) // store not used since we pass in a multifeed
  core.use('pointer', mockView)
  core.ready('pointer', () => {
    core.writer('kappa-local', function (err, feed) {
      if (err) console.error(err)

      feed.ready(() => {
        const objPub = {
          text: 'text without a timestamp'
        }
        feed.append(objPub, () => {
          cb()
        })
      })
    })
  })
}

function anotherWriter (core, cb) {
  core.writer('another-writer', function (err, feed) {
    if (err) throw err

    feed.ready(() => {
      const objPub = {
        text: 'text without a timestamp'
      }
      feed.append(objPub, () => {
        cb()
      })
    })
  })
}
