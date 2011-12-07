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