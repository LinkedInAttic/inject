/*
Inject
Copyright 2011 LinkedIn

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

asyncTest("Anon - simple", 3, function() {
  require.setModuleRoot("/tests/amd/includes/spec/anon");
  require(["a","b"], function(a, b) {
    equal("a", a.name);
    equal("b", b.name);
    equal("c", b.cName);
    start();
  });
});

asyncTest("Anon - circular", 6, function() {
  require.setModuleRoot("/tests/amd/includes/spec/anon");
  require(["require", "two", "funcTwo", "funcThree"], function(require, two, funcTwo, funcThree) {
    var args = two.doSomething(),
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

asyncTest("Anon - relativeModuleId", 4, function() {
  require.setModuleRoot("/tests/amd/includes/spec/anon");
  require.addRule("array", {path:"impl/array"});
  require(["require", "array"], function(require, array) {
    equal("impl/array", array.name);
    equal("util", array.utilNameUl);
    equal("impl/util", array.utilNameCl);
    equal("../util", array.utilNameUUl);
    start();
  });
});

test("Basic - defineAmd", 1, function() {
  equal("object", typeof define.amd);
});

asyncTest("Basic - simple", 3, function() {
  require.setModuleRoot("/tests/amd/includes/spec/basic");
  require(["a", "b"], function(a, b) {
    equal("a", a.name);
    equal("b", b.name);
    equal("c", b.cName);
    start();
  });
});

asyncTest("Basic - circular", 6, function() {
  require.setModuleRoot("/tests/amd/includes/spec/basic");
  require(["require", "two", "funcTwo", "funcThree"], function(require, two, funcTwo, funcThree) {
    var args = two.doSomething(),
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

asyncTest("Function String - funcString", 8, function() {
  require.setModuleRoot("/tests/amd/includes/spec/funcstring");
  require(["one", "two", "three"], function(one, two, three) {
    var args = two.doSomething(),
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

asyncTest("Named Wrapped - basic", 3, function() {
  require.setModuleRoot("/tests/amd/includes/spec/namewrapped");
  require(["car"], function(car) {
    equal("car", car.name);
    equal("wheels", car.wheels.name);
    equal("engine", car.engine.name);
    start();
  });
});

asyncTest("Require - basic", 4, function() {
  require.setModuleRoot("/tests/amd/includes/spec/require");
  require.ensure(["require", "a"], function(require) {
    require(["b", "c"], function(b, c) {
      equal("a", require('a').name);
      equal("b", b.name);
      equal("c", c.name);
      equal(true, /c\/templates\/first\.txt$/.test(c.url));
      start();
    });
  });
});