module("CommonJS: Modules 1.1 Extension - setExports", {
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

asyncTest("setExports proposal", 2, function() {
  require.setModuleRoot("http://localhost:4000/tests/modules-1.1/includes/proposal");
  require.ensure(["setexports"], function(require) {
    var add = require("setexports");
    equal(add(2), 3, "add function available");
    start();
  });
});
