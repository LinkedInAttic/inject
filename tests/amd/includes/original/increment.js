var add = require('math').add;
exports.inc = function(val) {
  return add(val, 1);
};

ok(true, "increment.js loaded");