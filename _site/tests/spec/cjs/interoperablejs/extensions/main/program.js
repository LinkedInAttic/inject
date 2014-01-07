var test = require('test');
test.assert(require.main !== undefined, 'require.main is defined');
test.assert(require(require.main) === exports, 'require.main refers to program');
test.print('DONE', 'info');
