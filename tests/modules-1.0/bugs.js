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

module("CommonJS: Modules 1.0 Bugs", {
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

// requiring a module that has commented lines- those lines should not run
asyncTest("#59 require() statements in commented lines should be ignored", 1, function() {
  require.setModuleRoot("http://localhost:4000/tests/modules-1.0/includes/bugs");
  require.run("bug_59");
});

// circular dependencies
asyncTest("#65 circular dependencies should be resolved", 4, function() {
  require.setModuleRoot("http://localhost:4000/tests/modules-1.0/includes/bugs");
  require.run("bug_65");
});

// requiring a module that has commented lines- those lines should not run
asyncTest("#88 require() statements with no space before them should still run", 2, function() {
  require.setModuleRoot("http://localhost:4000/tests/modules-1.0/includes/bugs");
  require.run("bug_88");
});
