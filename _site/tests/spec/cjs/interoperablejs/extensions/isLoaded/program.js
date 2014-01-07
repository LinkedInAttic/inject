var console = require('console');
var test = require('test');
test.assert(require.isLoaded('program'), 'current isLoaded');
test.assert(require.isLoaded('a') == false, 'not yet loaded');
require('a');
test.assert(require.isLoaded('a'), 'depdendency is loaded');
test.print('DONE', 'info');
