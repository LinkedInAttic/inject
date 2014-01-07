var test = require('test');
foo = function () {};
test.assert(typeof foo != "undefined" && exports.foo == foo, 'free assignment bound to exports');

var a = require('a');
test.assert(a.aVeryUnlikelyIdentifier, 'free assignment exported from other module');
test.assert(typeof aVeryUnlikelyIdentifier == "undefined", 'free assignment not implicitly communicated with common scope');

test.print('DONE', 'info');
