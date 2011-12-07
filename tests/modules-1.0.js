module("CommonJS: Modules 1.0", {
  setup: function() {
    if (localStorage) {
      localStorage.clear();
    }
    Inject.reset();
    require.setModuleRoot("http://localhost:4000/tests/requires/modules-1.0");
  },
  teardown: function() {
    if (localStorage) {
      localStorage.clear();
    }
  }
});

asyncTest("run program.js", 4, function() {
  require.run("program");
});

asyncTest("compliance", 7, function() {
  require.run("compliance");
});

// ----------------------------------------------------------------------

module("CommonJS: Modules 1.0 bugs", {
  setup: function() {
    if (localStorage) {
      localStorage.clear();
    }
    Inject.reset();
    require.setModuleRoot("http://localhost:4000/tests/requires/modules-1.0");
  },
  teardown: function() {
    if (localStorage) {
      localStorage.clear();
    }
  }
});

// require math twice, the second time after a reset (simulate page reload)
asyncTest("#57 require from cache simulates an OK 200", 3, function() {
  require.ensure(["math"], function() {
    Inject.reset();
    require.setModuleRoot("http://localhost:4000/tests/requires/modules-1.0");
    require.ensure(["math"], function() {
      ok(true, "module loaded from localStorage cache correctly");
      start();
    });
  });
});

// requiring a module that has commented lines- those lines should not run
asyncTest("#59 require() statements in commented lines should be ignored", 1, function() {
  require.run("bug_59");
});