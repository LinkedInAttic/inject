// query-string
asyncTest("Make sure query string params are handled properly in pointcut paths", 2, function() {
  Inject.addFileRule(/foo/, function(path) {
    return "./foo.js?foo=1&bar=2";
  });
  Inject.addContentRule(/foo/, function(next, contents) {
    next(["",
      "var a = document.createElement('a');",
      "a.href = module.uri;",
      "ok(a.search == '?foo=1&bar=2', 'Query string parameters were properly preserved');",
      contents,
    ""].join('\n'));
  });

  require.ensure(["foo"], function(require) {
    equal(require("foo").foo, "foo", "module exports loaded");
    start();
  });
});