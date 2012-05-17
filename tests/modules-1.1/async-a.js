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

module("CommonJS: Modules 1.1 Extension - Async/A", {
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

asyncTest("require.ensure", 3, function() {
  require.setModuleRoot("/tests/modules-1.1/includes/spec");
  require.ensure(['increment'], function(require) {
    var inc = require('increment').increment;
    var a = 1;
    equal(inc(a), 2, "increment a");
    start();
  });
});

// require.ensure was running dependencies at compile time
asyncTest("#58 require.ensure runtime dependencies only (false)", 1, function() {
  require.setModuleRoot("/tests/modules-1.1/includes/bugs");
  require.ensure(["bug_58"], function(require) {
    var runner = require("bug_58");
    runner.runTest(false); // do not include subfile
  });
});

asyncTest("#58 require.ensure runtime dependencies only (true)", 3, function() {
  require.setModuleRoot("/tests/modules-1.1/includes/bugs");
  require.ensure(["bug_58"], function(require) {
    var runner = require("bug_58");
    runner.runTest(true); // include subfile
  });
});