module("CommonJS: Modules 1.1.1", {
  setup: function() {
    if (localStorage) {
      localStorage.clear();
    }
    Inject.reset();
    require.setModuleRoot("http://localhost:4000/tests/requires/modules-1.1.1");
  },
  teardown: function() {
    if (localStorage) {
      localStorage.clear();
    }
  }
});

asyncTest("run program.js", 5, function() {
  require.run("program");
});

asyncTest("#56 require.ensure overlapping dependencies", 3, function() {
  /*
  foo depends on bar
  bar has a delay of 3 seconds built in
  */
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