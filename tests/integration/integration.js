
var sandbox;
module("integration :: features", {
  setup: function() {
    sandbox = new Sandbox(false);
    loadDependencies(sandbox, [
      "/inject.js"
    ], function(sandbox) {
      clearAllCaches(sandbox);
      exposeQUnit(sandbox);
    });
  },
  teardown: function() {
    sandbox = null;
  }
});

asyncTest("Make sure query string params are handled properly in pointcut paths", 2, function() {
  sandbox.global.Inject.setModuleRoot("/tests/integration/includes/");
  sandbox.global.Inject.manifest({
    "foo": {
      path: "./foo.js?foo=1&bar=2",
      after: function() {
        var a = document.createElement('a');
        a.href = module.uri;
        ok(a.search == "?foo=1&bar=2", "Query string parameters were properly preserved");
      }
    }
  });
  
  sandbox.global.require.ensure(["foo"], function(require) {
    equal(require("foo").foo, "foo", "module exports loaded");
    start();
  });
});

asyncTest("Enable Source Map (if supported)", 1, function() {
  sandbox.global.Inject.enableDebug("sourceMap");
  sandbox.global.Inject.setModuleRoot("/tests/integration/includes/");
  sandbox.global.require.run("sourcemap");
});
