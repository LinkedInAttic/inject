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

var sandbox;
module("spec :: CommonJS :: Modules 1.0 on multiple domains", {
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

// skip these tests if not running localhost...
if (/localhost/.test(location.host)) {
  var urlBase = ([location.protocol,"//",location.host]).join(""),
      altBase = urlBase.replace(/:4000/, ":4001");
  asyncTest("same domain (baseline)", EXPECTATIONS, function() {
    sandbox.global.Inject.setModuleRoot(urlBase+"/tests/spec/modules-1.0/includes/spec/");
    sandbox.global.require.run("program");
  });

  asyncTest("alternate domain", EXPECTATIONS, function() {
    sandbox.global.Inject.setModuleRoot(altBase+"/tests/spec/modules-1.0/includes/spec/");
    sandbox.global.Inject.setCrossDomain({
      relayFile: altBase+"/relay.html",
      relaySwf: altBase+"/relay.swf"
    });
    sandbox.global.require.run("program");
  });
}

})();