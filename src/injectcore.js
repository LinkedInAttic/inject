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

var InjectCore;
(function() {
  var AsStatic = Class.extend(function() {
    return {
      init: function() {},
      createRequire: function(path) {
        var req = new RequireContext(path);
        var require = proxy(req.require, req);
        require.ensure = proxy(req.ensure, req);
        require.run = proxy(req.run, req);
        require.toUrl = proxy(Analyzer.toUrl, Analyzer);
        return require;
      },
      createDefine: function(path) {
        var req = new RequireContext(path);
        var define = proxy(req.define, req);
        define.amd = {};
        return define;
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
        throw new Error("TODO");
      },
      clearFileRegistry: function() {
        // remove all files from our communicator
        throw new Error("TODO");
      },
      enableDebug: function(key, value) {
        userConfig.debug[key] = value || true;
      }
    };
  });
  InjectCore = new AsStatic();
})();
