ok(true,"string test terms delimited by forward slashes loaded");


var foo = require("identifiers/divide");
equal(foo.divide(10), 5, "string require module load using forward slash");

var bar = require('../relative');
equal(bar.divide(10), 5, "relative path '..' test pass");

var boo = require("./math");
equal(boo.add(4,4), 8, "relative path '.' test pass")


try {
var qux = require("identifiers/divide.js");
  equal(bar.divide(10), 5 , "Test file illegal File extension Pass");
}
catch(e) {
  ok(true, "module naming error .js detected ")
  
}


start();