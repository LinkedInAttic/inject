module("CommonJS: Modules 1.1", {
  setup: function() {
    if (localStorage) {
      localStorage.clear();
    }
    Inject.reset();
    require.setModuleRoot("http://localhost:4000/tests/requires/modules-1.1");
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

asyncTest("setExports", 2, function() {
  require.ensure(["setexports"], function(require) {
    var add = require("setexports");
    equal(add(2), 3, "add function available");
    start();
  });
});