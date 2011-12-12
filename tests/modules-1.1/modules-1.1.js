module("CommonJS: Modules 1.1", {
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
  require.setModuleRoot("http://localhost:4000/tests/modules-1.1/includes/spec");
  require.run("compliance");
});

asyncTest("Sample Code", 5, function() {
  require.setModuleRoot("http://localhost:4000/tests/modules-1.1/includes/spec");
  require.run("program");
});

asyncTest("setExports proposal", 2, function() {
  require.setModuleRoot("http://localhost:4000/tests/modules-1.1/includes/proposal");
  require.ensure(["setexports"], function(require) {
    var add = require("setexports");
    equal(add(2), 3, "add function available");
    start();
  });
});