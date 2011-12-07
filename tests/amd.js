module("Asynchronous Module Definition", {
  setup: function() {
    if (localStorage) {
      localStorage.clear();
    }
    Inject.reset();
    require.setModuleRoot("http://localhost:4000/tests/requires/amd");
  },
  teardown: function() {
    if (localStorage) {
      localStorage.clear();
    }
  }
});

asyncTest("#56 require.ensure with delay", 5, function() {
  var calls = 2;
  
  // ---------------
  // emulate the same process of <script src="amd/increment.delay.js"></script>
  define('increment.delay', ['exports', 'math', 'delay'], function(exports, math, delay) {
    exports.inc = function(val) {
      return math.add(val, 1);
    };
    exports.isDelayed = true;
    exports.delayedBy = delay.delay.duration;
    
    ok(true, "Module increment.delay loaded");

    if (--calls === 0) { start(); }
  });
  // ---------------
  
  require.ensure(["increment.delay"], function(require) {
    var delayInc = require("increment.delay");
    equal(delayInc.inc(5), 6, "increments");
    equal(delayInc.delayedBy, 2000, "delayedBy");
    if (--calls === 0) { start(); }
  });
});

