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
      createRequire: function(id, path) {
        var req = new RequireContext(id, path);
        var require = proxy(req.require, req);
        require.ensure = proxy(req.ensure, req);
        require.run = proxy(req.run, req);
        // resolve an identifier to a URL
        require.toUrl = function(identifier) {
          var resolvedId = RulesEngine.resolveIdentifier(identifier, id);
          var resolvedPath = RulesEngine.resolveUrl(resolvedId);
          return resolvedPath;
        };
        return require;
      },
      createDefine: function(id, path) {
        var req = new RequireContext(id, path);
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
      clearCache: function() {
        if (HAS_LOCAL_STORAGE && lscache) {
          lscache.flush();
        }
      },
      setExpires: function(seconds) {
        userConfig.fileExpires = seconds || 0;
      },
      setCacheKey: function(cacheKey) {

        var lscacheAppCacheKey;

        if( !cacheKey || cacheKey < 0 ) {
          return false;
        }

        if( HAS_LOCAL_STORAGE ){
          lscacheAppCacheKey = lscache.get(LSCACHE_APP_KEY_STRING)
        }

        if( lscacheAppCacheKey && lscacheAppCacheKey != cacheKey ){
          lscache.flush();
          lscacheAppCacheKey = 0;
        }

        if( !lscacheAppCacheKey ){
          lscache.set(LSCACHE_APP_KEY_STRING, cacheKey);
        }
      },
      reset: function() {
        this.clearCache();
        Executor.clearCaches();
        Communicator.clearCaches();
      },
      enableDebug: function(key, value) {
        userConfig.debug[key] = value || true;
      }
    };
  });
  InjectCore = new AsStatic();
})();
