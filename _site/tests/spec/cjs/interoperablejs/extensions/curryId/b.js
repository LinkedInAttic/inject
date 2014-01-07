var a = require('a');
exports.foo = function () {
    return a.foo();
};
exports.bar = a.foo;
