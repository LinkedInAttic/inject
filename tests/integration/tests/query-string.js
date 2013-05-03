// query-string
asyncTest("Make sure query string params are handled properly in pointcut paths", 2, function() {
  Inject.manifest({
    "foo": {
      matches: /foo/,
      path: "./foo.js?foo=1&bar=2",
      pointcuts: {
        afterFetch: function(next, text) {
          var fn = function() {
            var a = document.createElement('a');
            a.href = module.uri;
            ok(a.search == "?foo=1&bar=2", "Query string parameters were properly preserved");
          };

          // a simple way to migrate from after pointcuts to afterFetch
          next(null, text + '(' + fn.toString() + '());');
        }
      }
    }
  });

  require.ensure(["foo"], function(require) {
    equal(require("foo").foo, "foo", "module exports loaded");
    start();
  });
});