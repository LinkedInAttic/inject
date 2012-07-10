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

var Inject;
(function() {
  var AsStatic = Class.extend(function() {
    return {
      init: function() {},
      // creates a require suite scoped to a path
      createRequire: function(path) {
        return new RequireContext(path);
      },
      setModuleRoot: function(root) {
        userConfig.moduleRoot = root;
      },
      setCrossDomain: function(crossDomainConfig) {
        userConfig.xd.relayFile = crossDomainConfig.relayFile || null;
        userConfig.xd.relaySwf = crossDomainConfig.relaySwf || null;
      },
      clearCache: function() {},
      setExpires: function(seconds) {
        userConfig.fileExpires = seconds || 0;
      },
      reset: function() {
        // remove all files from our communicator
        // remove all results from our executor
      },
      clearFileRegistry: function() {
        // remove all files from our communicator
      },
      enableDebug: function(key, value) {
        userConfig.debug[key] = value || true;
      }
    };
  });
  Inject = new AsStatic();
})();
