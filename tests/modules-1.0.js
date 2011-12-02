module("CommonJS: Modules 1.0 - same domain, no cache", {
  setup: function() {
    if (localStorage) {
      localStorage.clear();
    }
    Inject.reset();
    require.setModuleRoot("http://localhost:4000/tests/requires/modules-1.0");
  },
  teardown: function() {
    if (localStorage) {
      localStorage.clear();
    }
  }
});

asyncTest("run program.js", 3, function() {
  require.run("program");
});

module("CommonJS: Modules 1.0 - same domain, no cache", {
  setup: function() {
    if (localStorage) {
      localStorage.clear();
    }
    Inject.reset();
    require.setModuleRoot("http://localhost:4001/tests/requires/modules-1.0");
    require.setCrossDomain("http://localhost:4000/relay.html",
                           "http://localhost:4001/relay.html");
  },
  teardown: function() {
    if (localStorage) {
      localStorage.clear();
    }
  }
});

asyncTest("run program.js", 3, function() {
  require.run("program");
});