var inc = require('increment').increment;
var a = 1;
equal(inc(a), 2, "increment a");
equal(module.id, "program", "module.id is set");

ok(true, "program.js loaded");
start();