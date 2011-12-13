module("CommonJS: Modules 1.0", {
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

asyncTest("Sample Code", 4, function() {
  require.setModuleRoot("http://localhost:4000/tests/modules-1.0/includes/spec");
  require.run("program");
});

asyncTest("Compliance", 8, function() {
  require.setModuleRoot("http://localhost:4000/tests/modules-1.0/includes/spec");
  require.run("compliance");
});

// require math twice, the second time after a reset (simulate page reload)
asyncTest("#57 require from cache simulates an OK 200", 3, function() {
  require.setModuleRoot("http://localhost:4000/tests/modules-1.0/includes/spec");
  require.ensure(["math"], function() {
    Inject.reset();
    require.setModuleRoot("http://localhost:4000/tests/modules-1.0/includes/spec");
    require.ensure(["math"], function() {
      ok(true, "module loaded from localStorage cache correctly");
      start();
    });
  });
});

// requiring a module that has commented lines- those lines should not run
asyncTest("#59 require() statements in commented lines should be ignored", 1, function() {
  require.setModuleRoot("http://localhost:4000/tests/modules-1.0/includes/bugs");
  require.run("bug_59");
});

// circular dependencies
asyncTest("#65 circular dependencies should be resolved", 4, function() {
  require.setModuleRoot("http://localhost:4000/tests/modules-1.0/includes/bugs");
  require.run("bug_65");
});