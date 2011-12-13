module("AMD Specification", {
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

asyncTest("Basic", 3, function() {
  require.setModuleRoot("http://localhost:4000/tests/amd/includes/spec/basic");
  require.ensure(["a","b"], function(require) {
    var a = require("a"),
        b = require("b");

    equal('a', a.name);
    equal('b', b.name);
    equal('c', b.cName);
    start();
  });
});

asyncTest("Function String", 8, function() {
  require.setModuleRoot("http://localhost:4000/tests/amd/includes/spec/funcstring");
  require.ensure(["one", "two", "three"], function(require) {
    var one = require('one'),
    two = require('two'),
    three = require('three'),
    args = one.doSomething(),
    oneMod = one.module;
    
    equal("large", one.size);
    equal("small", two.size);
    equal("small", args.size);
    equal("redtwo", args.color);
    equal("one", oneMod.id);
    equal('three', three.name);
    equal('four', three.fourName);
    equal('five', three.fiveName);
    start();
  });
});

asyncTest("Name Wrapped", 3, function() {
  require.setModuleRoot("http://localhost:4000/tests/amd/includes/spec/namewrapped");
  require.ensure(["car"], function(require) {
    var car = require("car");
    
    equal('car', car.name);
    equal('wheels', car.wheels.name);
    equal('engine', car.engine.name);
    start();
  });
});