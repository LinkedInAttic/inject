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

asyncTest("basic", 6, function() {
  var calls = 2;
  
  // ---------------
  // emulate the same process of <script src="amd/?.js"></script>
  define('a', {
    name: 'a'
  });
  define('b', [], function() {
    return {name: 'b'};
  });
  define('c', ['exports'], function(exports) {
    exports.name = "c";
  });
  define('d', ['exports', 'a', 'b', 'c'], function(exports, a ,b ,c) {
    exports.name = "d";
    exports.b = b.name + ' from d';
  });
  define(['exports', 'a'], function(exports, a) {
    var name = a.name + " from anon define";
    
    ok(true, "anon define loaded");
  });
  // ---------------
  
  require.ensure(["a", "b", "c", "d"], function(require) {
    var a = require("a"),
        b = require("b"),
        c = require("c"),
        d = require("d");
    
    equal(a.name, "a", "get a name");
    equal(b.name, "b", "get b name");
    equal(c.name, "c", "get c name");
    equal(d.name, "d", "get d name");
    equal(d.b, "b from d", "get b from d");
    start();
  });
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

