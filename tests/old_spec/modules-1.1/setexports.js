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
module("spec :: CommonJS :: Modules 1.1 setExports", {
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

asyncTest("setExports proposal", 2, function() {
  sandbox.global.Inject.setModuleRoot("/tests/spec/modules-1.1/includes/proposal/");
  sandbox.global.require.ensure(["setexports"], function(require) {
    var add = require("setexports");
    equal(add(2), 3, "add function available");
    start();
  });
});
