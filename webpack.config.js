const webpack = require('webpack')
const path = require('path')
const pkg = require('./package.json')
const TerserPlugin = require('terser-webpack-plugin')

const mode = process.env.NODE_ENV || 'development'

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, ''),
    filename: pkg.browser,
    library: 'hypnsDidManager',
    libraryTarget: 'umd'
  },
  resolve: {
    mainFields: ['browser', 'module', 'main'],
    alias: {
      process: 'process/browser',
      multifeed: 'hypermultifeed',
      hyperswarm: 'hyperswarm-web',
      'sodium-universal': 'sodium-javascript', // browser field in package.json has this listed as native not universal
      'random-access-application': '@DougAnderson444/random-access-idb'
    },
    extensions: ['.tsx', '.ts', '.js'],
    fallback: {
      crypto: require.resolve('crypto-browserify'),
      process: require.resolve('process/browser'),
      stream: require.resolve('stream-browserify'),
      assert: require.resolve('assert/'),
      url: require.resolve('url/'),
      buffer: require.resolve('buffer/'),
      events: require.resolve('events/'),
      util: require.resolve('util/'),
      os: require.resolve('os-browserify/browser'),
      path: require.resolve('path-browserify'),
      fs: false
    }
  },
  mode,
  optimization: {
    usedExports: true, // tree-shaking
    minimize: true,
    minimizer: [new TerserPlugin()]
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  plugins: [
    // pending https://github.com/sveltejs/svelte/issues/2377
    // dev && new webpack.HotModuleReplacementPlugin(),
    new webpack.IgnorePlugin({
      resourceRegExp: /^\.\/wordlists\/(?!english)/,
      contextRegExp: /bip39/
    }),
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process/browser'
    })
  ]
}
