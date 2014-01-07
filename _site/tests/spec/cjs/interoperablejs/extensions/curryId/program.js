var test = require('test');

exports.foo = require.curryId(function (id) {
    return id;
});

exports.bar = require.curryId(function (id, a, b, c) {
    return b;
});

var a = require('a');

test.assert(a.foo() == 'program', 'curryId');
test.assert(exports.foo() == 'program', 'curryId in own module');
test.assert(a.bar() == 'a', 'curryId of self in foreign module');
test.assert(exports.bar(10, 20, 30) == 20, 'curryId preserves arguments');

var b = require('b');
test.assert(b.foo() == 'b', 'curryId in third party module');
test.assert(b.bar() == 'program', 'curryId in copied export');

test.print('DONE', 'info');

