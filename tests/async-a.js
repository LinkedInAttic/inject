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
