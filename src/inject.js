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
      require: function(moduleIdOrList, callback) {},
      ensure: function(moduleList, callback) {},
      run: function(moduleId) {},
      define: function() {
        var args = Array.prototype.slice(arguments, 0);
        // id, dependencies, executionFunction
        // dependencies, executionFunction
        // executionFunction
      },
      setModuleRoot: function(root) {},
      setCrossDomain: function(crossDomainConfig) {},
      clearCache: function() {},
      setExpires: function(seconds) {},
      reset: function() {},
      clearFileRegistry: function() {},
      addRule: function() {
        // passthrough
        Analyzer.addRule.apply(Analyzer, arguments);
      },
      manifest: function() {
        // passthrough
        Analyzer.manifest.apply(Analyzer, arguments);
      }
    };
  });
  Inject = new AsStatic();
})();
