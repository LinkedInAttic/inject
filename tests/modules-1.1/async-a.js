module("Modules 1.1 Extension - Async/A", {
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

asyncTest("require.ensure", 3, function() {
  require.setModuleRoot("http://localhost:4000/tests/modules-1.1/includes/spec");
  require.ensure(['increment'], function(require) {
    var inc = require('increment').increment;
    var a = 1;
    equal(inc(a), 2, "increment a");
    start();
  });
});

// require.ensure was running dependencies at compile time
asyncTest("#58 require.ensure runtime dependencies only", 1, function() {
  require.setModuleRoot("http://localhost:4000/tests/modules-1.1/includes/bugs");
  require.ensure(["bug_58"], function(require) {
    var runner = require("bug_58");
    runner.runTest(false); // do not include subfile
  });
});

asyncTest("#58 require.ensure runtime dependencies only", 3, function() {
  require.setModuleRoot("http://localhost:4000/tests/modules-1.1/includes/bugs");
  require.ensure(["bug_58"], function(require) {
    var runner = require("bug_58");
    runner.runTest(true); // include subfile
  });
});