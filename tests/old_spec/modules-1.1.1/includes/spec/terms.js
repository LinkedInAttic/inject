var control = require("divide");
equal(control.divide(10), 5, "control");

// // up one level
var ul = require("identifiers/ul");
equal(ul.divide(10), 5, "../divide from identifiers/ul resolves to ./divide");

// // up two levels
var uul = require("identifiers/deep/uul");
equal(ul.divide(10), 5, "../../divide from identifiers/deep/ul resolves to ./divide");

// proxy (behaves as current level)
var pcl = require("divideproxy");
equal(pcl.divide(10), 5, "./divide from divideproxy (identifiers/deep/pcl) resolves to ./divide");

raises(function() {
  var fails = require("invalid$module");
}, "invalid identifier should not run");

start();