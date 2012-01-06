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

module("CommonJS: Modules 1.1", {
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

asyncTest("Compliance", 13, function() {
  require.setModuleRoot("http://localhost:4000/tests/modules-1.1/includes/spec");
  require.run("compliance");
});

asyncTest("Sample Code", 5, function() {
  require.setModuleRoot("http://localhost:4000/tests/modules-1.1/includes/spec");
  require.run("program");
});
