var a = require("bug_65_a");

exports.name = "b";
exports.aName = a.name;

ok(true, "file b loaded");