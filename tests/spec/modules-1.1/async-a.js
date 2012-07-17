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
module("spec :: CommonJS :: Modules 1.1 Async/A", {
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

asyncTest("require.ensure", 3, function() {
  sandbox.global.Inject.setModuleRoot("/tests/spec/modules-1.1/includes/spec/");
  sandbox.global.require.ensure(['increment'], function(require) {
    var inc = require('increment').increment;
    var a = 1;
    equal(inc(a), 2, "increment a");
    start();
  });
});

// require.ensure was running dependencies at compile time
asyncTest("#58 require.ensure runtime dependencies only (false)", 1, function() {
  sandbox.global.Inject.setModuleRoot("/tests/spec/modules-1.1/includes/bugs/");
  sandbox.global.require.ensure(["bug_58"], function(require) {
    var runner = require("bug_58");
    runner.runTest(false); // do not include subfile
  });
});

asyncTest("#58 require.ensure runtime dependencies only (true)", 3, function() {
  sandbox.global.Inject.setModuleRoot("/tests/spec/modules-1.1/includes/bugs/");
  sandbox.global.require.ensure(["bug_58"], function(require) {
    var runner = require("bug_58");
    runner.runTest(true); // include subfile
  });
});

asyncTest("#117 require.ensure() - if first argument (moduleList) is an Array, no exception should be thrown", 1, function() {
  sandbox.global.Inject.setModuleRoot('/tests/spec/modules-1.1/includes/bugs/');
  sandbox.global.require.ensure(['bug_117'], function(require){
    ok(true, "require.ensure() called with moduleList as an Array didn't throw an exception");
    start();
  });
});

test("#117 require.ensure() - if first argument (moduleList) is an Object, an exception should be thrown", 1, function() {
  sandbox.global.Inject.setModuleRoot('/tests/spec/modules-1.1/includes/bugs/');
  raises(function() {
    sandbox.global.require.ensure({}, function(require){});
  });
});

test("#117 require.ensure() - if first argument (moduleList) is a Number, an exception should be thrown", 1, function() {
  sandbox.global.Inject.setModuleRoot('/tests/spec/modules-1.1/includes/bugs/');
  raises(function() {
    sandbox.global.require.ensure(1, function(require){});
  });
});

test("#117 require.ensure() - if first argument (moduleList) is a String, an exception should be thrown", 1, function() {
  sandbox.global.Inject.setModuleRoot('/tests/spec/modules-1.1/includes/bugs/');
  raises(function() {
    sandbox.global.require.ensure("invalid moduleList", function(require){});
  });
});

test("#117 require.ensure() - if first argument (moduleList) is null, an exception should be thrown", 1, function() {
  sandbox.global.Inject.setModuleRoot('/tests/spec/amd/includes/bugs/');
  raises(function() {
    sandbox.global.require.ensure(null, function(require){});
  });
});

test("#117 require.ensure() - if first argument (moduleList) is undefined, an exception should be thrown", 1, function() {
  sandbox.global.Inject.setModuleRoot('/tests/spec/amd/includes/bugs/');
  raises(function() {
    var moduleList;
    sandbox.global.require.ensure(moduleList, function(require){});
  });
});