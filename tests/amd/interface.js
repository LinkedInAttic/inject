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

module("AMD Interface", {
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

asyncTest("define(name, object)", 1, function() {
  require.setModuleRoot("http://localhost:4000/tests/amd/includes/original");
  require.ensure(["a"], function(require) {
    var a = require("a");
    equal(a.name, "a", "get a name");
    start();
  });
});

asyncTest("define(name, dependencies (empty), function)", 1, function() {
  require.setModuleRoot("http://localhost:4000/tests/amd/includes/original");
  require.ensure(["b"], function(require) {
    var b = require("b");
    equal(b.name, "b", "get b name");
    start();
  });
});

asyncTest("define(name, dependencies, function)", 1, function() {
  require.setModuleRoot("http://localhost:4000/tests/amd/includes/original");
  require.ensure(["c"], function(require) {
    var c = require("c");
    equal(c.name, "c", "get c name");
    start();
  });
});

asyncTest("define(name, dependencies (with exports), functio)n", 2, function() {
  require.setModuleRoot("http://localhost:4000/tests/amd/includes/original");
  require.ensure(["d"], function(require) {
    var d = require("d");
    equal(d.name, "d", "get d name");
    equal(d.b, "b from d", "get b from d");
    start();
  });
});

asyncTest("define(dependencies (with exports), function)", 3, function() {
  require.setModuleRoot("http://localhost:4000/tests/amd/includes/original");
  require.ensure(["e"], function() {
    ok(true, "anon define ensure callback executed");
    start();
  });
});

asyncTest("#56 require.ensure with delay", 5, function() {
  require.setModuleRoot("http://localhost:4000/tests/amd/includes/original");
  require.ensure(["increment.delay"], function(require) {
    var delayInc = require("increment.delay");
    equal(delayInc.inc(5), 6, "increments");
    equal(delayInc.delayedBy, 2000, "delayedBy");
    start();
  });
});