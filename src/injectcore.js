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

/**
 * The InjectCore is the main configuration point for Inject.
 * It is able to create require() and define() methods within a
 * path context, as well as assign configuration for the
 * various options.
 * @file
**/
var InjectCore;
(function() {
  /**
   * This is the internal definition of the InjectCore class
   * @class
   */
  var AsStatic = Class.extend(function() {
    return {
      /**
       * @constructs InjectCore
       */
      init: function() {},

      /**
       * create a require() method within a given context path
       * relative require() calls can be based on the provided
       * id and path
       * @method InjectCore.createRequire
       * @param {string} id - the module identifier for relative module IDs
       * @param {string} path - the module path for relative path operations
       * @public
       * @returns a function adhearing to CommonJS and AMD require()
       */
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

      /**
       * create a define() method within a given context path
       * relative define() calls can be based on the provided
       * id and path
       * @method InjectCore.createDefine
       * @param {string} id - the module identifier for relative module IDs
       * @param {string} path - the module path for relative path operations
       * @public
       * @returns a function adhearing to the AMD define() method
       */
      createDefine: function(id, path) {
        var req = new RequireContext(id, path);
        var define = proxy(req.define, req);
        define.amd = {};
        return define;
      },

      /**
       * set the base path for all module includes
       * @method InjectCore.setModuleRoot
       * @param {string} root - the fully qualified URL for modules to be included from
       * @public
       */
      setModuleRoot: function(root) {
        userConfig.moduleRoot = root;
      },

      /**
       * set the cross domain configuration
       * the cross domain config is an object consisting of two properties,
       * the relayHtml and the relaySwf. The HTML and SWF file should be
       * located on the remote server (for example the CDN).
       * @method InjectCore.setCrossDomain
       * @param {object} crossDomainConfig - the confuiguration object
       * @public
       */
      setCrossDomain: function(crossDomainConfig) {
        userConfig.xd.relayFile = crossDomainConfig.relayFile || null;
        userConfig.xd.relaySwf = crossDomainConfig.relaySwf || null;
      },

      /**
       * clear the localstorage caches
       * @method InjectCore.clearCache
       * @public
       */
      clearCache: function() {
        if (HAS_LOCAL_STORAGE && lscache) {
          lscache.flush();
        }
      },

      /**
       * set a time (in seconds) for how long to preserve items in cache
       * the default time is 300 seconds
       * @method InjectCore.setExpires
       * @param {int} seconds - the number of seconds to retain files for
       * @public
       * @see userConfig.fileExpires
       */
      setExpires: function(seconds) {
        userConfig.fileExpires = seconds || 0;
      },

      /**
       * set a unique cache identifier for Inject. This allows the parent
       * page to "bust" the cache by invoking setCacheKey with a different
       * value.
       * @method InjectCore.setCacheKey
       * @param {string} cacheKey - the identifier to reference this cache version
       * @public
       */
      setCacheKey: function(cacheKey) {
        var lscacheAppCacheKey;
        var flush = false;

        if (!HAS_LOCAL_STORAGE || !lscache) {
          return false;
        }

        lscacheAppCacheKey = lscache.get(LSCACHE_APP_KEY_STRING);

        if ( (!cacheKey && lscacheAppCacheKey) ||
             (lscacheAppCacheKey !== null && lscacheAppCacheKey != cacheKey) ||
             (lscacheAppCacheKey === null && cacheKey) ) {
          lscache.flush();
          lscache.set(LSCACHE_APP_KEY_STRING, cacheKey);
        }
      },

      /**
       * reset the entire Inject system. This clears the cache, execution caches,
       * and any communicator caches.
       * @method InjectCore.reset
       * @public
       */
      reset: function() {
        this.clearCache();
        Executor.clearCaches();
        Communicator.clearCaches();
      },

      /**
       * enable debugging options. For a full list of debugging options,
       * the wiki page for "Debugging Options" lists the possible keys
       * and impact
       * @method InjectCore.enableDebug
       * @param {string} key - the debugging key to enable or disable
       * @param {boolean} value - the value to assign for the key, defaults to true
       * @public
       */
      enableDebug: function(key, value) {
        userConfig.debug[key] = value || true;
      }
    };
  });
  InjectCore = new AsStatic();
})();
