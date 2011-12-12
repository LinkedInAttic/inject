module("CommonJS: Modules 1.1.1", {
  setup: function() {
    if (localStorage) {
      localStorage.clear();
    }
    Inject.reset();
  },
  teardown: function() {
    if (localStorage) {
      localStorage.clear();
    }
  }
});

asyncTest("Compliance", 13, function() {
  require.setModuleRoot("http://localhost:4000/tests/modules-1.1.1/includes/spec");
  require.run("compliance");
});

asyncTest("Sample Code", 5, function() {
  require.setModuleRoot("http://localhost:4000/tests/modules-1.1.1/includes/spec");
  require.run("program");
});

asyncTest("Compliance - Module Identifiers", 5, function() {
  require.setModuleRoot("http://localhost:4000/tests/modules-1.1.1/includes/spec/identifiers");
  require.run("terms");
} );

asyncTest("#56 require.ensure overlapping dependencies", 3, function() {
  /*
  foo depends on bar
  bar has a delay of 3 seconds built in
  */
  require.setModuleRoot("http://localhost:4000/tests/modules-1.1.1/includes/bugs");
  // this test has 2 asynchronous threads
  var calls = 2;
  require.ensure(["ensure-overlap/addition", "ensure-overlap/multiply"], function(require) {
    var foo = require("ensure-overlap/addition");
    equal(foo.increment(2), 3, "increments");
    equal(foo.multiply(2), 4, "multiplies");
    if (--calls === 0) { start(); }
  });
  require.ensure(["ensure-overlap/addition"], function(require) {
    var foo = require("ensure-overlap/addition");
    equal(foo.increment(2), 3, "increments");
    if (--calls === 0) { start(); }
  });
});