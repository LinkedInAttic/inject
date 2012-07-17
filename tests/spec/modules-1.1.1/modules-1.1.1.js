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
module("spec :: CommonJS :: Modules 1.1.1", {
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

asyncTest("Compliance", 13, function() {
  sandbox.global.Inject.setModuleRoot("/tests/spec/modules-1.1.1/includes/spec/");
  sandbox.global.require.run("compliance");
});

asyncTest("Compliance - Module Identifiers", 8, function() {
  sandbox.global.Inject.setModuleRoot("/tests/spec/modules-1.1.1/includes/spec/identifiers/");
  sandbox.global.require.run("terms");
});

asyncTest("Sample Code", 5, function() {
  sandbox.global.Inject.setModuleRoot("/tests/spec/modules-1.1.1/includes/spec/");
  sandbox.global.require.run("program");
});

asyncTest("#56 require.ensure should handle overlapping dependencies as pending", 3, function() {
  /*
  foo depends on bar
  bar has a delay of 3 seconds built in
  */
  sandbox.global.Inject.setModuleRoot("/tests/spec/modules-1.1.1/includes/bugs/");
  // this test has 2 asynchronous threads
  var calls = 2;
  sandbox.global.require.ensure(["bug_56", "bug_56_a"], function(require) {
    var foo = require("bug_56");
    equal(foo.increment(2), 3, "increments");
    equal(foo.multiply(2), 4, "multiplies");
    if (--calls === 0) { start(); }
  });
  sandbox.global.require.ensure(["bug_56"], function(require) {
    var foo = require("bug_56");
    equal(foo.increment(2), 3, "increments");
    if (--calls === 0) { start(); }
  });
});