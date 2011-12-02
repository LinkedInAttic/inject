module("CommonJS: Modules 1.0 - same domain, no cache", {
  setup: function() {
    require.setModuleRoot("http://localhost:4004/requires/modules-1.0");
  },
  teardown: function() {
    require.clearCache();
  }
});

asyncTest("program.js", 1, function() {
  require.run("program");
});