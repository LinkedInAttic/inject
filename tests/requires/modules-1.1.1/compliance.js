// require must be a function
ok(typeof(require) === "function", "require is a function");

// require must accept only a string
try {
  require("math"); // adds one to run stack for execution
}
catch(e) {
  ok(false, "require accepts a string");
}
try {
  require(varname);
  ok(false, "require does not accept things that are not string");
}
catch(e) {
  ok(true, "require does not accept things that are not string");
}

try {
  require(1);
  ok(false, "require does not accept integers");
}
catch(e) {
  ok(true, "require does not accept integers");
}

// require returns an export
// -- skipped -- validated in base module code

// require with invalid module throws error
try {
  require("thismoduledoesnotexist");
  ok(false, "require throws an error when module does not exist");
}
catch(e) {
  ok(true, "require throws an error when module does not exist");
}

ok(true, "skipped require.main test");

ok(true, "skipped require.paths test");

// modules exists and is an object
ok(typeof(module) === "object", "module is an object {}");

// exports is an object
ok(typeof(exports) === "object", "exports is an object {}");

// module.exports is exports
ok(module.exports === exports, "module.exports is the same as exports");

// module.exports is and object literal
equal(Object.prototype.toString.call(module.exports), "[object Object]", "exports variable is an object literal");

// module.id is properly set
ok(module.id && module.id.length > 0 && module.id == "compliance", "module.id is properly set");

// module.uri is properly set
ok(module.uri && module.uri.length > 0 , "module.uri is properly set to: " + module.uri);
start();