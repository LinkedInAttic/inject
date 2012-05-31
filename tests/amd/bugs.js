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

module("AMD Bugs", {
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

asyncTest("#56 require.ensure with delay", 5, function() {
  require.setModuleRoot("/tests/amd/includes/original");
  require.ensure(["increment.delay"], function(require) {
    var delayInc = require("increment.delay");
    equal(delayInc.inc(5), 6, "increments");
    equal(delayInc.delayedBy, 2000, "delayedBy");
    start();
  });
});

asyncTest("#91 module.exports should be able to have a function assigned to it in AMD mode", 1, function() {
  require.setModuleRoot("/tests/amd/includes/bugs");
  require.ensure(["bug_91"], function(require) {
    var f = require('bug_91');
    equal(f("Bob"), "hello Bob");
    start();
  });
});

asyncTest("#106 inline define() calls make module.exports available to later require() calls", 1, function() {
  require.setModuleRoot("/tests/amd/includes/bugs");
  
  // manually define a module
  define("bug_106_pre", function() {
    return {
      foo: "foo"
    };
  });

  require.ensure(["bug_106"], function(require) {
    var mod = require('bug_106');
    equal(mod.foo, "foo");
    start();
  });
});

asyncTest("#117 require.ensure() - if first argument (moduleList) is an Array, no exception should be thrown", 1, function() {
  require.setModuleRoot('/tests/amd/includes/bugs');
  require.ensure(['bug_117'], function(require){
    ok(true, "require.ensure() called with moduleList as an Array didn't throw an exception");
  });
  start();
});

asyncTest("#117 require.ensure() - if first argument (moduleList) is an Object, an exception should be thrown", 1, function() {
  require.setModuleRoot('/tests/amd/includes/bugs');
  raises(
    function() {
      require.ensure({}, function(require){
        ok(false, "require.ensure() called with moduleList as an Object should have thrown an exception");
      });
    });
  start();
});

asyncTest("#117 require.ensure() - if first argument (moduleList) is a Number, an exception should be thrown", 1, function() {
  require.setModuleRoot('/tests/amd/includes/bugs');
  raises(
    function() {
      require.ensure(1, function(require){
        ok(false, "require.ensure() called with moduleList as a Number should have thrown an exception");
      });
    });
  start();
});

asyncTest("#117 require.ensure() - if first argument (moduleList) is a String, an exception should be thrown", 1, function() {
  require.setModuleRoot('/tests/amd/includes/bugs');
  raises(
    function() {
      require.ensure("invalid moduleList", function(require){
        ok(false, "require.ensure() called with moduleList as a String should have thrown an exception");
      });
    });
  start();
});

asyncTest("#117 require.ensure() - if first argument (moduleList) is null, an exception should be thrown", 1, function() {
  require.setModuleRoot('/tests/amd/includes/bugs');
  raises(
    function() {
      require.ensure(null, function(require){
        ok(false, "require.ensure() called with moduleList as null should have thrown an exception");
      });
    });
  start();
});

asyncTest("#117 require.ensure() - if first argument (moduleList) is undefined, an exception should be thrown", 1, function() {
  require.setModuleRoot('/tests/amd/includes/bugs');
  raises(
    function() {
      var moduleList;
      require.ensure(moduleList, function(require){
        ok(false, "require.ensure() called with moduleList as undefined should have thrown an exception");
      });
    });
  start();
});