var b = require("bug_65_b");

exports.name = "a";
exports.bName = b.name;

ok(true, "file a loaded");