const browsers = {
  chrome_latest: {
    base: 'BrowserStack',
    browser: 'chrome',
    os: 'Windows',
    os_version: '10'
  },
  chrome_lowest: {
    base: 'BrowserStack',
    browser: 'chrome',
    os: 'Windows',
    browser_version: '63.0',
    os_version: '10'
  },
  firefox_latest: {
    base: 'BrowserStack',
    browser: 'firefox',
    os: 'Windows',
    os_version: '10'
  },
  firefox_lowest: {
    base: 'BrowserStack',
    browser: 'firefox',
    os: 'Windows',
    browser_version: '57.0',
    os_version: '10'
  },
  edge_latest: {
    base: 'BrowserStack',
    browser: 'edge',
    os: 'Windows',
    os_version: '10'
  },
  edge_lowest: {
    base: 'BrowserStack',
    browser: 'edge',
    os: 'Windows',
    browser_version: '80.0',
    os_version: '10'
  },
  opera_latest: {
    base: 'BrowserStack',
    browser: 'opera',
    os: 'Windows',
    os_version: '10'
  },
  opera_lowest: {
    base: 'BrowserStack',
    browser: 'opera',
    os: 'Windows',
    browser_version: '50.0',
    os_version: '10'
  },
  safari_latest: {
    base: 'BrowserStack',
    browser: 'safari',
    os: 'OS X',
    os_version: 'Catalina'
  },
  safari_lowest: {
    base: 'BrowserStack',
    browser: 'safari',
    os: 'OS X',
    os_version: 'High Sierra'
  },
  ios_latest: {
    base: 'BrowserStack',
    device: 'iPhone 11',
    os: 'ios',
    real_mobile: true,
    os_version: '14'
  },
  ios_lowest: {
    base: 'BrowserStack',
    device: 'iPhone XR',
    os: 'ios',
    real_mobile: true,
    os_version: '12'
  },
  android_latest: {
    base: 'BrowserStack',
    device: 'Google Pixel 4',
    os: 'android',
    real_mobile: true,
    os_version: '11.0'
  }
}

module.exports = function (config) {
  config.set({
    frameworks: ['mocha', 'chai', 'webpack'],
    files: [
      // all files ending in ".test.js"
      // !!! use watched: false as we use webpacks watch
      { pattern: 'test/index.js', watched: false }
    ],
    reporters: ['progress'],
    port: 9876, // karma web server port
    colors: true,
    logLevel: config.LOG_INFO,
    browsers: ['ChromeHeadless'],
    autoWatch: false,
    // singleRun: false, // Karma captures browsers, runs the tests and exits
    concurrency: Infinity,
    plugins: [
      'karma-webpack',
      'karma-mocha',
      'karma-chai',
      'karma-chrome-launcher'
    ],
    preprocessors: {
      // add webpack as preprocessor
      'test/**/*.js': ['webpack']
    },
    webpack: {
      // karma watches the test entry points
      // Do NOT specify the entry option
      // webpack watches dependencies

      // webpack configuration
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
          path: require.resolve('path-browserify')
        }
      }
    }
  })
}
