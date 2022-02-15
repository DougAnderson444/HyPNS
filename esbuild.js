const esbuild = require('esbuild');
const alias = require('esbuild-plugin-alias');

esbuild.build({
  entryPoints: ['src/index.js'],
  bundle: true,
  outfile: 'hypns.es.js',
  plugins: [
    alias({
      'hyperswarm': 'hyperswarm-web',
    }),
  ],
}).catch(() => process.exit(1))