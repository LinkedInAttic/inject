/*jshint evil:true */
/*global context:true, document:true */

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
 * An InjectContext represents an instance of Inject. It contains
 * references to all of the pieces in Inject, as well as the ability
 * to create additional contexts. Every InjectContext is configured
 * independently. The global Inject, require, and define variables
 * are output from an InjectContext object.
 **/
var InjectContext = Fiber.extend(function() {
  var components;
  return {
    /**
     * @constructor
     */
    init: function(baseUrl) {
      // where internal variables are stored
      this._ = {};
      
      // create all environment objects used in this interaction
      this.env = {
        config: {
          moduleRoot: null,
          suffixes: true,
          sourceUrls: false,
          relayFile: null,
          expires: 0
        },
        instance: guid()
      };
      
      // initialize these objects as late as possible
      if (!components) {
        components = allComponents();
      }
      
      this.env.analyzer = new components.Analyzer(this.env);
      this.env.communicator = new components.Communicator(this.env);
      this.env.executor = new components.Executor(this.env);
      this.env.requireContext = new components.RequireContext(this.env);
      this.env.rulesEngine = new components.RulesEngine(this.env);
      this.env.TreeNode = components.TreeNode;
      this.env.TreeRunner = components.TreeRunner;
      this.env.cache = components.cache;
      
      // set a module root if they created a context with a base Url
      if (baseUrl) {
        this.setModuleRoot(baseUrl);
      }
      else {
        // create the require/define calls as part of the API
        this.require = this.env.requireContext.createRequire();
        this.define = this.env.requireContext.createDefine();
      }

    },

    // ======================================================================
    // configuration APIs
    // ======================================================================

    /**
     * sets the module root for this inject instance
     * all module URLs are based on this base value
     * @method InjectContext#setModuleRoot
     * @param {String} url - the url as the module root
     * @return this
     */
    setModuleRoot: function(url) {
      this.env.config.moduleRoot = url;
      this.env.requireContext = new components.RequireContext(this.env);
      this.require = this.env.requireContext.createRequire(url);
      this.define = this.env.requireContext.createDefine(url);
      return this;
    },

    /**
     * Save the cross domain configuration
     * @method InjectContext#setCrossDomain
     * @param {Object|String} xdInfo - either an object (0.6.0 or earlier, or a string to the relay file)
     * @return this
     */
    setCrossDomain: function(xdInfo) {
      if (typeof xdInfo == 'string') {
        this.env.config.relayFile = xdInfo;
      }
      else {
        this.env.config.relayFile = xdInfo.relayFile;
      }
      return this;
    },

    /**
     * Disables the automatic appending of suffixes to resolved
     * URLs. Useful when using a content server that perhaps puts
     * items in the query string, or may be using alternative file
     * names for which the "js" suffix would be problematic
     * @method InjectContext#disableSuffixes
     * @return this
     */
    disableSuffixes: function() {
      this.env.config.suffixes = false;
      return this;
    },
  
    /**
     * Enables the automatic appending of suffixes to resolved (default behavior)
     * URLs. Useful when using a content server that perhaps puts
     * items in the query string, or may be using alternative file
     * names for which the "js" suffix would be problematic
     * @method InjectContext#enableSuffixes
     * @return this
     */
    enableSuffixes: function() {
      this.env.config.suffixes = true;
      return this;
    },
    
    // ======================================================================
    // environment APIs
    // ======================================================================
    
    /**
     * Set the expiry for items written to in localStorage by this Inject instance
     * @method InjectContext@setExpires
     * @param {int} seconds - the number of seconds to retain things in cache for
     * @return this
     */
    setExpires: function(seconds) {
      this.env.config.expires = seconds || 0;
      return this;
    },
    
    /**
     * Set the cache key to be used by lscache
     * This is a useful way to "expire" cached versions of modules automatically
     * by using an app configuration. When the URLs are static and do not contain
     * unique URLs, a value such as the SVN revision may be helpful here to ensure
     * that you are not loading cached content in a development environment.
     * This is a companion to setting the expires to "0".
     * @method InjectContext#setCacheKey
     * @param {String} cacheKey - the new cache key to use
     * @return this
     */
    setCacheKey: function (cacheKey) {
      var lscacheAppCacheKey;

      if (!components.cache) {
        return false;
      }

      lscacheAppCacheKey = components.cache.get(LSCACHE_APP_KEY_STRING);

      if ((!cacheKey && lscacheAppCacheKey) ||
           (lscacheAppCacheKey !== null && lscacheAppCacheKey !== cacheKey) ||
           (lscacheAppCacheKey === null && cacheKey)) {
        components.cache.flush();
        components.cache.set(LSCACHE_APP_KEY_STRING, cacheKey);
      }
      
      return this;
    },
    
    /**
     * Reset the Inject environment, and (optionally) the global caches
     * @method InjectContext#reset
     * @param {Boolean} global - if TRUE, global caches such as communicator are also reset
     * @return this
     */
    reset: function (global) {
      this.env.executor.clearCaches();
      
      if (global) {
        this.env.communicator.clearCaches();
      }
      return this;
    },
    
    /**
     * Disables AMD functionality for this InjectContext
     * @method InjectContext#disableAMD
     * @return this
     */
    disableAMD: function() {
      this.define.amd = false;
      return this.define;
    },
    
    /**
     * Enables AMD functionality for this InjectContext
     * @method InjectContext#enableAMD
     * @return this
     */
    enableAMD: function() {
      this.define.amd = {};
      return this.define;
    },
    
    // ======================================================================
    // rule based APIs
    // ======================================================================
    
    /**
     * Enable the use of AMD plugins
     * (note: this is a one way operation on an Inject Context)
     * Adds rules to support the traditional AMD plugin interface
     * @method InjectContext#enableAMDPlugins
     * @return this
     */
    enableAMDPlugins: function() {
      this.env.config.amdPlugins = true;
      amdPluginBreakout(this.env);
      return this;
    },
    
    /**
     * Adds a module rule to the environment
     * @see RulesEngine#addModuleRule
     * @return this
     */
    addModuleRule: function() {
      this.env.rulesEngine.addModuleRule.apply(this.env.rulesEngine, arguments);
      return this;
    },
    
    /**
     * Adds a file rule to the environment
     * @see RulesEngine#addFileRule
     * @return this
     */
    addFileRule: function() {
      this.env.rulesEngine.addFileRule.apply(this.env.rulesEngine, arguments);
      return this;
    },
    
    /**
     * Adds a content transformation rule to the environment
     * @see RulesEngine#addContentRule
     * @return this
     */
    addContentRule: function() {
      this.env.rulesEngine.addContentRule.apply(this.env.rulesEngine, arguments);
      return this;
    },
    
    /**
     * Adds a fetch / retrieval rule to the environment
     * @see RulesEngine#addFetchRule
     * @return this
     */
    addFetchRule: function() {
      this.env.rulesEngine.addFetchRule.apply(this.env.rulesEngine, arguments);
      return this;
    },
    
    /**
     * Adds a package alias rule to the environment
     * @see RulesEngine#addPackage
     * @return this
     */
    addPackage: function() {
      this.env.rulesEngine.addPackage.apply(this.env.rulesEngine, arguments);
      return this;
    },
    
    // ======================================================================
    // debug APIs
    // ======================================================================
    
    /**
     * Enables source url functionality
     * when enabled, source url information will be added to the content to
     * help in debugging.
     * @method InjectContext#enableSourceUrls
     * @return this
     */
    enableSourceUrls: function() {
      this.env.config.sourceUrls = true;
      return this;
    },
    
    /**
     * Disables source url functionality
     * when disabled, source url information will be added to the content to
     * help in debugging.
     * @method InjectContext#disableSourceUrls
     * @return this
     */
    disableSourceUrls: function() {
      this.env.config.sourceUrls = false;
      return this;
    },
  
    // ======================================================================
    // replication APIs
    // ======================================================================
    
    /**
     * Create a new InjectContext with a new base URL
     * @see InjectContext.createContext
     * @return InjectContext
     */
    createContext: function() {
      return InjectContext.createContext.apply(InjectContext, arguments);
    }
  };
});

/**
 * Create a new InjectContext object, with an optional base url as the root
 * @method InjectContext.createContext
 * @param {String} baseUrl - the base url for the InjectContext to use (optional)
 * @return InjectContext
 */
InjectContext.createContext = function(baseUrl) {
  var ic = new InjectContext(baseUrl);
  return {
    require: ic.require,
    define: ic.define,
    Inject: ic
  };
};

/**
 * A helper function to late-retrieve the other components
 * used in an Inject Context
 * @private
 * @method InjectContext.allComponents
 */
function allComponents() {
  return {
    Analyzer: Analyzer,
    Communicator: Communicator,
    Executor: Executor,
    RequireContext: RequireContext,
    RulesEngine: RulesEngine,
    TreeNode: TreeNode,
    TreeRunner: TreeRunner,
    cache: (HAS_LOCAL_STORAGE && lscache) ? lscache : null
  };
}

/**
 * A breakout function for all the work needed to enable AMD plugins,
 * moved to keep the readability high for the main object
 * @private
 * @method InjectContext.amdPluginBreakout
 * @param {Object} env - the environment from the InjectContext
 */
function amdPluginBreakout(env) {
  // modules matching pattern
  env.rulesEngine.addFetchRule(/^.+?\!.+$/, function (next, content, resolver, communicator, options) {
    var moduleName = options.moduleId;
    var parentId = options.parentId;
    var parentUrl = options.parentUrl;

    var pieces = moduleName.split('!');
    var pluginId = resolver.module(pieces[0], parentId);
    var pluginUrl = resolver.url(pluginId, parentUrl);
    var identifier = pieces[1];

    var parentRequire = env.requireContext.createRequire(parentId, parentUrl);
    
    // when loading via a plugin, once you call load() or load.fromText(), you are DONE
    // this special require ensures you cannot call require() after you've gotten the text
    // we then copy all the properties over to ensure it behaves (duck typing) like the
    // normal require
    var pluginRequire = function() {
      return parentRequire.apply(parentRequire, arguments);
    };
    var addToPluginRequire = function(prop) {
      pluginRequire[prop] = function() {
        return parentRequire[prop].apply(parentRequire, arguments);
      };
    };
    for (var prop in parentRequire) {
      if (HAS_OWN_PROPERTY.call(parentRequire, prop)) {
        addToPluginRequire(prop);
      }
    }
    
    // the resolver function is passed into a plugin for resolving a name relative to
    // the current module's scope. We pass through to resolver.module which passes
    // through to RulesEngine
    var resolveFn = function (name) {
      return resolver.module(name, parentId);
    };
    
    // to run an AMD plugin
    parentRequire([pluginId], function(plugin) {
      // normalize the module ID if the plugin supports it
      var normalized = (plugin.normalize) ? plugin.normalize(identifier, resolveFn) : resolveFn(identifier);
      
      // create the onload handlers that trigger the callback on completion
      var onload = function(contents) {
        
        // if it is a string, then its exports are saved as a URI component
        if (typeof(contents) === 'string') {
          contents = ['module.exports = decodeURIComponent("', encodeURIComponent(contents), '");'].join('');
        }

        next(null, contents);
      };
      onload.fromText = function(moduleName, contents) {
        if (!contents) {
          contents = moduleName;
          moduleName = null;
        }
        
        // the contents of this are good
        // we must evaluate it on the spot
        var m = env.executor.createModule(moduleName);
        env.executor.runModule(m, contents);
      };

      plugin.load(normalized, pluginRequire, onload, {});
    });
  });
}