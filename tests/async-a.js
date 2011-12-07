module("Async/A", {
  setup: function() {
    if (localStorage) {
      localStorage.clear();
    }
    Inject.reset();
    require.setModuleRoot("http://localhost:4000/tests/requires/async-a");
  },
  teardown: function() {
    if (localStorage) {
      localStorage.clear();
    }
  }
});

asyncTest("require.ensure", 3, function() {
  require.ensure(['increment'], function(require) {
    var inc = require('increment').inc;
    var a = 1;
    equal(inc(a), 2, "increment a");
    start();
  });
});

// require.ensure was running dependencies at compile time
asyncTest("#58 require.ensure runtime dependencies only", 1, function() {
  require.ensure(["bug_58"], function(require) {
    var runner = require("bug_58");
    runner.runTest(false); // do not include subfile
  });
});

asyncTest("#58 require.ensure runtime dependencies only", 3, function() {
  require.ensure(["bug_58"], function(require) {
    var runner = require("bug_58");
    runner.runTest(true); // include subfile
  });
});