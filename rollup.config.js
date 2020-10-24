import resolve from '@rollup/plugin-node-resolve'
import babel from '@rollup/plugin-babel'
import alias from '@rollup/plugin-alias'

import commonjs from '@rollup/plugin-commonjs'
import nodeGlobals from 'rollup-plugin-node-globals'
import builtins from 'rollup-plugin-node-builtins'
import json from '@rollup/plugin-json'

import pkg from './package.json'
import babelConfig from './babel.config.json'
// const extensions = ['.js']

/**
 * Note that most of the times @rollup/plugin-commonjs should go before other plugins that transform your modules — this is to prevent other plugins from making changes that break the CommonJS detection. An exception for this rule is the Babel plugin, if you're using it then place it before the commonjs one.
 * Contradicts: https://github.com/rollup/rollup-plugin-commonjs/issues/239#issuecomment-353764860
 */
/**
 * babel-plugin-transform-commonjs: convert Node-style CommonJS modules into the ES module
 * @babel/plugin-transform-modules-commonjs: transforms ECMAScript modules to CommonJS
 * @rollup/plugin-commonjs: convert CommonJS modules to ES6
 */
export default [
  // browser-friendly build
  {
    input: 'src/index.js',
    output: [
      { // UMD
        name: 'hypns', // Necessary for iife/umd bundles that exports values in which case it is the global variable name representing your bundle
        file: pkg.browser[pkg.main],
        exports: 'named',
        format: 'umd' // Universal Module Definition, works as amd, cjs and iife all in one
      },
      { // ES Module
        file: pkg.browser[pkg.module],
        exports: 'named',
        format: 'es' // Keep the bundle as an ES module file, suitable for other bundlers and inclusion as a <script type=module> tag in modern browsers (alias: esm, module)
      },
      { // Explicit Browser ES Module
        file: 'browser/index.mjs',
        exports: 'named',
        format: 'es' // Keep the bundle as an ES module file, suitable for other bundlers and inclusion as a <script type=module> tag in modern browsers (alias: esm, module)
      }
    ],
    plugins: [
      alias({
        entries: [
          { find: 'utils', replacement: './node_modules/util/util.js' },
          { find: 'multifeed', replacement: 'hypermultifeed' },
          { find: 'hyperswarm', replacement: 'hyperswarm-web' },
          { find: 'sodium-universal', replacement: 'sodium-javascript' },
          { find: 'random-access-application', replacement: '@DougAnderson444/random-access-idb' }
        ]
      }),
      // #1 resolve before commonjs
      resolve({
        browser: true,
        preferBuiltins: false
      }),
      // #2 babel before commonjs, after resolve
      babel({
        exclude: /node_modules/, // if excluded, get require not defined...
        presets: babelConfig.env.browser.presets,
        plugins: babelConfig.env.browser.plugins,
        babelHelpers: 'bundled'
      }),
      commonjs({
        include: [/node_modules/, /HyPNS/, /hypns/] // require is not defined?
      }), // converts Nodejs modules to ES6 module // https://rollupjs.org/guide/en/#rollupplugin-commonjs
      nodeGlobals(), // after commonjs, before builtins
      builtins(), // builtins after commonjs
      json()
    ]
  },

  // CommonJS (for Node) and ES module (for bundlers) build.
  // (We could have three entries in the configuration array
  // instead of two, but it's quicker to generate multiple
  // builds from a single configuration where possible, using
  // an array for the `output` option, where we can specify
  // `file` and `format` for each target)
  {
    external: [ // suppress rollup warning by makig intentions explicit
      'tmp',
      'pify',
      'corestore',
      'level-mem',
      'kappa-core',
      'hypermultifeed',
      'hypercore-crypto',
      'sodium-universal',
      'random-access-memory',
      'random-access-application',
      '@corestore/networker',
      'hypermultifeed/networker',
      '@DougAnderson444/kappa-view-list',
      '@DougAnderson444/random-access-idb'
    ],
    input: 'src/index.js',
    output: [
      { file: pkg.main, format: 'cjs', exports: 'named' }, //
      { file: pkg.module, format: 'es', exports: 'named' } //
    ],
    plugins: [
      // resolve({
      //   resolveOnly: ['sodium-universal'],
      //   extensions,
      //   preferBuiltins: false
      // }),
      babel({
        exclude: /node_modules/,
        presets: babelConfig.env.module.presets,
        plugins: babelConfig.env.module.plugins,
        babelHelpers: 'bundled'
      })
    ]
  }
]
