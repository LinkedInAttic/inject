module("Inject Bugs", {
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

asyncTest("#105 exceptions surfaced correctly in console", 1, function() {
  var oldError = window.onerror;
  window.onerror = function(err, where, line) {
    ok(/Parse error/.test(err), "raised syntax error exception");
    window.onerror = oldError;
    start();
    return true;
  };
  require.setModuleRoot("/tests/inject/includes/bugs");
  require.run("bug_105");
});

// When a relative path is resolved, additional tests keep running
asyncTest("#123 applyRules: a resolved relative path continues through stack", 1, function() {
  require.setModuleRoot("/tests/modules-1.0/includes/bugs");
  require.addRule(/^a_bug_123\//, {
    path: function(path) {
      path = path.replace("a_bug_123", "bug_123");
      return ([
        location.protocol, "//", location.host,
        "/tests/inject/includes/bugs/", path
      ]).join("");
    }
  });
  require.run("a_bug_123/program");
});