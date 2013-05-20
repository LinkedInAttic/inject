// query-string
asyncTest("Make sure query string params are handled properly in pointcut paths", 2, function() {
  Inject.addRule(/foo/, {
    path: "./foo.js?foo=1&bar=2",
    pointcuts: {
      afterFetch: function(next, text) {
        next(null, ["",
          "var a = document.createElement('a');",
          "a.href = module.uri;",
          "ok(a.search == '?foo=1&bar=2', 'Query string parameters were properly preserved');",
          text].join('\n'));
      }
    }
  });

  require.ensure(["foo"], function(require) {
    equal(require("foo").foo, "foo", "module exports loaded");
    start();
  });
});