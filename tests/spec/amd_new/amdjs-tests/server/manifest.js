// implied impl/ directory...
exports.manifest = {
  "requirejs": {
    "name":   'RequireJS',
    "impl":   'requirejs/require.js',
    "config": 'requirejs/config.js'
  },
  "needs": {
    "name":   'Needs JS',
    "impl":   'needs/needs.js',
    "config": 'needs/config.js'
  },
  "inject": {
    "name":   'Inject',
    "impl":   'inject/inject.js',
    "config": 'inject/config.js'
  },
  "lsjs": {
    "name":   'lsjs',
    "impl":   'lsjs/lsjs.js',
    "config": 'lsjs/config.js'
  }
};