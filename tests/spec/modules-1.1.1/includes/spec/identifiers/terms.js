ok(true,"string test terms delimited by forward slashes loaded");

var foo = require("divide");
equal(foo.divide(10), 5, "string require module load using forward slash");

var bar = require('../relative-two');
equal(bar.divide(10), 5, "relative path '..' test pass");

var boo = require("./relative-one");
equal(boo.divide(4), 2, "relative path '.' test pass");

var boo = require("relative-three/relative-three");
equal(boo.divide(4), 2, "relative path '.' test pass");
equal(boo.divide_plus_one(10), 6, "relative path '.' test pass");
equal(boo.divide_minus_one(10), 4, "relative path '.' test pass");

raises(function() {
  var qux = require("invalid$module");
}, "invalid identifier should not run");

start();