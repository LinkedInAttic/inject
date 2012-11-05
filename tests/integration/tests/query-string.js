// query-string
asyncTest("Make sure query string params are handled properly in pointcut paths", 2, function() {
  Inject.manifest({
    "foo": {
      matches: /foo/,
      path: "./foo.js?foo=1&bar=2",
      pointcuts: {
        after: function() {
          var a = document.createElement('a');
          a.href = module.uri;
          ok(a.search == "?foo=1&bar=2", "Query string parameters were properly preserved");
        }
      }
    }
  });
  
  require.ensure(["foo"], function(require) {
    equal(require("foo").foo, "foo", "module exports loaded");
    start();
  });
});