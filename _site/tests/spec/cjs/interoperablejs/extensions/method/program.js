var test = require('test');
var a = require('a');
var foo = a.foo;
test.assert(a.foo() == a, 'calling a module member');
test.assert(foo() == (function (){return this})(), 'members not implicitly bound');
a.set(10);
test.assert(a.get() == 10, 'get and set')
test.assert(a.getClosed() === undefined, 'get closed');
var a2 = require('a');
a2.set(20);
test.assert(a.get() == 10, 'unique exports');
test.print('DONE', 'info');
