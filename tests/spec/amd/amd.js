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

var sandbox;
module("spec :: AMD :: AMD 1.0", {
  setup: function() {
    sandbox = new Sandbox(false);
    loadDependencies(sandbox, [
      "/inject.js"
    ], function(sandbox) {
      clearAllCaches(sandbox);
      exposeQUnit(sandbox);
    });
  },
  teardown: function() {
    sandbox = null;
  }
});

asyncTest("Anon - simple", 3, function() {
  sandbox.global.Inject.setModuleRoot("/tests/spec/amd/includes/spec/anon/");
  sandbox.global.require(["a","b"], function(a, b) {
    equal(a.name, "a");
    equal(b.name, "b");
    equal(b.cName, "c");
    start();
  });
});

asyncTest("Anon - circular", 6, function() {
  sandbox.global.Inject.setModuleRoot("/tests/spec/amd/includes/spec/anon/");
  sandbox.global.require(["require", "two", "funcTwo", "funcThree"], function(require, two, funcTwo, funcThree) {
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
  sandbox.global.Inject.setModuleRoot("/tests/spec/amd/includes/spec/anon/impl/");
  sandbox.global.require(["require", "array"], function(require, array) {
    equal("impl/array", array.name);
    equal("util", array.utilNameUl);
    equal("impl/util", array.utilNameCl);
    equal("../util", array.utilNameUUl);
    start();
  });
});

test("Basic - defineAmd", 1, function() {
  equal("object", typeof(sandbox.global.define.amd));
});

asyncTest("Basic - simple", 3, function() {
  sandbox.global.Inject.setModuleRoot("/tests/spec/amd/includes/spec/basic/");
  sandbox.global.require(["a", "b"], function(a, b) {
    equal("a", a.name);
    equal("b", b.name);
    equal("c", b.cName);
    start();
  });
});

asyncTest("Basic - circular", 6, function() {
  sandbox.global.Inject.setModuleRoot("/tests/spec/amd/includes/spec/basic/");
  sandbox.global.require(["require", "two", "funcTwo", "funcThree"], function(require, two, funcTwo, funcThree) {
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
  sandbox.global.Inject.setModuleRoot("/tests/spec/amd/includes/spec/funcstring/");
  sandbox.global.require(["one", "two", "three"], function(one, two, three) {
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
  sandbox.global.Inject.setModuleRoot("/tests/spec/amd/includes/spec/namewrapped/");
  sandbox.global.require(["car"], function(car) {
    equal("car", car.name);
    equal("wheels", car.wheels.name);
    equal("engine", car.engine.name);
    start();
  });
});

asyncTest("Require - basic", 4, function() {
  sandbox.global.Inject.setModuleRoot("/tests/spec/amd/includes/spec/require/");
  sandbox.global.require.ensure(["require", "a"], function(require) {
    require(["b", "c"], function(b, c) {
      equal("a", require('a').name);
      equal("b", b.name);
      equal("c", c.name);
      equal(true, /c\/templates\/first\.txt$/.test(c.url));
      start();
    });
  });
});