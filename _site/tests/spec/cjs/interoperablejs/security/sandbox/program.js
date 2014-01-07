var test = require('test');
var assert = test.assert;
var modules = require('modules');
var print = test.print;

var sandbox = modules.Sandbox(require.loader);
assert(sandbox('a').foo == sandbox('a').foo, 'sandbox == sandbox');
assert(require('a').foo !== sandbox('a').foo, 'require != sandbox');

var sandbox2 = modules.Sandbox(require.loader);
assert(sandbox('a').foo !== sandbox2('a').foo, 'sandbox != different sandbox');

var Sandbox = require('sandbox').Sandbox;
var sandbox3 = modules.Sandbox(require.loader);
assert(sandbox3('a').foo() == 1, 'homemade sandbox');

var Loader = require('loader').Loader;
var loader = Loader();
var sandbox4 = modules.Sandbox(loader);
assert(sandbox4('a').foo() == 2, 'homemade loader');

print('DONE', 'info');
