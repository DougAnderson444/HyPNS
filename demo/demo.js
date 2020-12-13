// this script gets bundled by Browserify into bundle.js and included in index.html
const App = require('./Demo.svelte')

const app = new App({
  target: document.getElementById('hypns-demo'), // document.querySelector("#hyper-kappa-chat-app"), // document.body, //  //
  props: {
    name: 'world'
  },
  hydrate: true
})
