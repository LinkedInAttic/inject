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
module("spec :: AMD :: AMD 1.0 bugs", {
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

asyncTest("#56 require.ensure with delay", 5, function() {
  sandbox.global.Inject.setModuleRoot("/tests/spec/amd/includes/original/");
  sandbox.global.require.ensure(["increment.delay"], function(require) {
    var delayInc = require("increment.delay");
    equal(delayInc.inc(5), 6, "increments");
    equal(delayInc.delayedBy, 2000, "delayedBy");
    start();
  });
});

asyncTest("#91 module.exports should be able to have a function assigned to it in AMD mode", 1, function() {
  sandbox.global.Inject.setModuleRoot("/tests/spec/amd/includes/bugs/");
  sandbox.global.require.ensure(["bug_91"], function(require) {
    var f = require('bug_91');
    equal(f("Bob"), "hello Bob");
    start();
  });
});

asyncTest("#106 inline define() calls make module.exports available to later require() calls", 1, function() {
  sandbox.global.Inject.setModuleRoot("/tests/spec/amd/includes/bugs/");
  
  // manually define a module
  sandbox.global.define("bug_106_pre", function() {
    return {
      foo: "foo"
    };
  });

  sandbox.global.require.ensure(["bug_106"], function(require) {
    var mod = require('bug_106');
    equal(mod.foo, "foo");
    start();
  });
});
