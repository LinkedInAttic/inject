var bar = require("bug_56_a");

exports.increment = function(val) { return val+1; };
exports.multiply = bar.multiply;