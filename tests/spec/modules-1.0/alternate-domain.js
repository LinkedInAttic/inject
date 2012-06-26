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

if (/localhost/.test(location.host)) {
  var urlBase = ([location.protocol,"//",location.host]).join(""),
      altBase = urlBase.replace(/:4000/, ":4001");
  asyncTest("same domain (baseline)", EXPECTATIONS, function() {
    Inject.setModuleRoot(urlBase+"/tests/modules-1.0/includes/spec");
    require.run("program");
  });

  asyncTest("alternate domain", EXPECTATIONS, function() {
    Inject.setModuleRoot(altBase+"/tests/modules-1.0/includes/spec");
    Inject.setCrossDomain({
      relayFile: altBase+"/relay.html",
      relayHelper: altBase+"/relay_helper.html"
    });
    require.run("program");
  });
}

})();