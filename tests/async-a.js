module("Async/A - same domain", {
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



module("Async/A - alternate domain", {
  setup: function() {
    if (localStorage) {
      localStorage.clear();
    }
    Inject.reset();
    require.setModuleRoot("http://localhost:4001/tests/requires/async-a");
    require.setCrossDomain("http://localhost:4000/relay.html",
                           "http://localhost:4001/relay.html");
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
