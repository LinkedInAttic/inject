// implied impl/ directory...
exports.manifest = {};

exports.manifest.requirejs = {
  name:   'RequireJS @ 2.1.5',
  impl:   'requirejs/require.js',
  config: 'requirejs/config.js'
};

exports.manifest.needs = {
  name:   'Needs JS @ a915dce3',
  impl:   'needs/needs.js',
  config: 'needs/config.js'
};

exports.manifest.inject = {
  name:   'Inject @ 0.4.1',
  impl:   'inject/inject.js',
  config: 'inject/config.js'
};

exports.manifest.lsjs = {
  name:   'lsjs @ e61412da',
  impl:   'lsjs/lsjs.js',
  config: 'lsjs/config.js'
};