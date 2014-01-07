var test = require('test');
test.assert(exports instanceof require.Module, 'exports instanceof Module');
test.print('DONE', 'info');
