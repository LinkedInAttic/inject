module("Asynchronous Module Definition", {
  setup: function() {
    if (localStorage) {
      localStorage.clear();
    }
    Inject.reset();
    require.setModuleRoot("http://localhost:4000/tests/requires/amd");
  },
  teardown: function() {
    if (localStorage) {
      localStorage.clear();
    }
  }
});

asyncTest("basic - name, object", 1, function() {
  require.ensure(["a"], function(require) {
    var a = require("a");
    equal(a.name, "a", "get a name");
    start();
  });
});

asyncTest("basic - name, dependencies (empty), function", 1, function() {
  require.ensure(["b"], function(require) {
    var b = require("b");
    equal(b.name, "b", "get b name");
    start();
  });
});

asyncTest("basic - name, dependencies, function", 1, function() {
  require.ensure(["c"], function(require) {
    var c = require("c");
    equal(c.name, "c", "get c name");
    start();
  });
});

asyncTest("basic - name, dependencies (with exports), function", 2, function() {
  require.ensure(["d"], function(require) {
    var d = require("d");
    equal(d.name, "d", "get d name");
    equal(d.b, "b from d", "get b from d");
    start();
  });
});

asyncTest("basic - dependencies (with exports), function", 3, function() {
  require.ensure(["e"], function() {
    ok(true, "anon define ensure callback executed");
    start();
  });
});

asyncTest("#56 require.ensure with delay", 5, function() {
  require.ensure(["increment.delay"], function(require) {
    var delayInc = require("increment.delay");
    equal(delayInc.inc(5), 6, "increments");
    equal(delayInc.delayedBy, 2000, "delayedBy");
    start();
  });
});

