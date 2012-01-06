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

(function() {

// the number of expectations for either same or different domains
// helps ensure we are consistent in our tests
var EXPECTATIONS = 4;

module("Multiple domain tests (based on Modules 1.0)", {
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

asyncTest("same domain (baseline)", EXPECTATIONS, function() {
  require.setModuleRoot("http://localhost:4000/tests/modules-1.0/includes/spec");
  require.run("program");
});

asyncTest("alternate domain", EXPECTATIONS, function() {
  require.setModuleRoot("http://localhost:4001/tests/modules-1.0/includes/spec");
  require.setCrossDomain("http://localhost:4000/relay.html",
                         "http://localhost:4001/relay.html");
  require.run("program");
});

})();