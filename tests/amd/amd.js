/*
Inject
Copyright 2011 Jakob Heuser

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing,
software distributed under the License is distributed on an "AS
IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
express or implied.   See the License for the specific language
governing permissions and limitations under the License.
*/

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

asyncTest("Basic - simple tests", 3, function() {
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

asyncTest("Basic - circular tests", 6, function() {
  require.setModuleRoot("http://localhost:4000/tests/amd/includes/spec/basic");
  require.ensure(["two", "funcTwo", "funcThree"], function(require) {
    var two = require("two"),
    funcTwo = require("funcTwo"),
    funcThree = require("funcThree"),
    args = two.doSomething(),
    twoInst = new funcTwo("TWO"),
    oneMod = two.getOneModule();

    equal("small", args.size);
    equal("redtwo", args.color);
    equal("one", oneMod.id);
    equal("TWO", twoInst.name);
    equal("ONE-NESTED", twoInst.oneName());
    equal("THREE-THREE_SUFFIX", funcThree("THREE"));
    start();
  });
});

asyncTest("Function String", 8, function() {
  require.setModuleRoot("http://localhost:4000/tests/amd/includes/spec/funcstring");
  require.ensure(["one", "two", "three"], function(require) {
    var one = require('one'),
    two = require('two'),
    three = require('three'),
    args = two.doSomething(),
    oneMod = two.getOneModule();
    
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