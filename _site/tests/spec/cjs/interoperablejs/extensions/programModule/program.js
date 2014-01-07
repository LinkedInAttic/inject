var test = require('test');
test.assert(exports === require('program'), 'program is a module');
test.print('DONE', 'info');
