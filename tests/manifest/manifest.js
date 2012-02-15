module("Manifest Tests", {
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

asyncTest("Require Module With Different Name", 1, function() {
  require.manifest({
    "myMath" : "math"
  });
  
  require.ensure(["myMath"], function() {
    ok(true, "successfully called module by alternate name via manifest mapping");
    start();
  });
});