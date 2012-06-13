module("Inject Tests", {
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

asyncTest("Make sure query string params are handled properly in pointcut paths", 1, function() {
  require.setModuleRoot("/examples/deps");

  require.manifest({
    "jQuery": {
      path: "./jquery-1.6.4.min.js?foo=1&bar=2",
      after: function(module) {
        var a = document.createElement('a');
        a.href = module.uri;
        ok(a.search == "?foo=1&bar=2", "Query string parameters were properly preserved");
      }
    }
  });
  
  require.ensure(["jQuery"], function(require) {
    start();
  });
});

asyncTest("Enable Source Map (firebug version)", 1, function() {
  Inject.enableDebug("sourceMap");
  require.setModuleRoot("/tests/inject/includes/spec");
  require.run("sourcemap");
});
