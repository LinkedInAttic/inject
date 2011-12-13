ok(true,"string test terms delimited by forward slashes loaded");

var foo = require("divide");
equal(foo.divide(10), 5, "string require module load using forward slash");

var bar = require('../relative-two');
equal(bar.divide(10), 5, "relative path '..' test pass");

var boo = require("./relative-one");
equal(boo.divide(4), 2, "relative path '.' test pass")

try {
  var qux = require("invalid$module");
  ok(false, "invalid identifier should not run");
}
catch(e) {
  ok(true, "module naming error .js detected ")
}

start();