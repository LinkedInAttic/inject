// added multiple requires on the same line
var bar = require("bar"); var baz = require("bar");

var barObj = new bar.Bar();

exports.foo = function() {};
exports.sampleString = "Stringness!";
exports.baz = barObj.baz();