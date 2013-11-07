/*global context:true */
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
    This file defines the public interface for Inject
    many functions in this collection pass through via proxy
    to internal methods
    @file public interface for Inject
 */
var globalRequire = new RequireContext();

var errorQueue = [];

/**
    This object contains the public interface for Inject.
    @class
    @type {object}
    @global
 */
context.Inject = {
  /**
      This object and its properties are meant solely for consumption
      @private
   */
  INTERNAL: {
    // expose all our classes for troubleshooting ease
    Classes: {
      Analyzer: Analyzer,
      Communicator: Communicator,
      Executor: Executor,
      InjectCore: InjectCore,
      RequireContext: RequireContext,
      RulesEngine: RulesEngine,
      TreeNode: TreeNode,
      TreeRunner: TreeRunner
    },
    
    // used by the executor. these let inject know the module that is currently running
    defineExecutingModuleAs: proxy(Executor.defineExecutingModuleAs, Executor),
    undefineExecutingModule: proxy(Executor.undefineExecutingModule, Executor),

    // a hash of publicly reachable module sandboxes ie exec0, exec1...
    executor: {},

    // a globally available require() call for the window and base page
    globalRequire: globalRequire
  },

  plugins: {},

  /**
      Clears any locally cached modules, downloads and local storage.
      @see InjectCore.reset
      @method
      @public
   */
  reset: proxy(InjectCore.reset, InjectCore),
  /**
      Enables debugging options.
      @see InjectCore.enableDebug
      @method
      @public
   */
  enableDebug: function () {
    InjectCore.enableDebug.apply(this, arguments);
  },
  
  /**
   * Add a listener for error events
   * @method onError
   * @public
   */
	onError: function(fn) {
    errorQueue.push(fn);
  },

  
  /**
   * Emit an error to all onError handlers
   * @method emit
   * @public
   */	
  emit: function(e) {
    for (var i = 0, len = errorQueue.length; i < len; i++) {
      errorQueue[i].call(context, e);
    }
  },


  /**
    Enables AMD Plugins if that's your thing
    Adds a special rule to make AMD plugins go round
    @method
    @public
  */
  enableAMDPlugins: function () {
    // modules matching pattern
    RulesEngine.addFetchRule(/^.+?\!.+$/, function (next, content, resolver, communicator, options) {
      var moduleName = options.moduleId;
      var parentId = options.parentId;
      var parentUrl = options.parentUrl;

      var pieces = moduleName.split('!');
      var pluginId = resolver.module(pieces[0], parentId);
      var pluginUrl = resolver.url(pluginId, parentUrl);
      var identifier = pieces[1];

      var parentRequire = RequireContext.createRequire(parentId, parentUrl);
      
      // when loading via a plugin, once you call load() or load.fromText(), you are DONE
      // this special require ensures you cannot call require() after you've gotten the text
      // we then copy all the properties over to ensure it behaves (duck typing) like the
      // normal require
      var loadCalled = false;
      var pluginRequire = function() {
        if (loadCalled) {
          return;
        }
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
          if (loadCalled) {
            return;
          }
          loadCalled = true;
          
          // if it is a string, then its exports are saved as a URI component
          if (typeof(contents) === 'string') {
            contents = ['module.exports = decodeURIComponent("', encodeURIComponent(contents), '");'].join('');
          }

          next(null, contents);
        };
        onload.fromText = function(moduleName, contents) {
          if (loadCalled) {
            return;
          }
          loadCalled = true;
          
          if (!contents) {
            contents = moduleName;
            moduleName = null;
          }
          
          // the contents of this are good
          next(null, contents);
        };
        
        plugin.load(normalized, pluginRequire, onload, {});
      });
    });
  },
  /**
      Sets base path for all module includes.
      @see InjectCore.setModuleRoot
      @method
      @public
   */
  setModuleRoot: function () {
    InjectCore.setModuleRoot.apply(this, arguments);
  },
  /**
      Set a time for how long to preserve items in cache.
      The default time is 300 seconds.
      @see InjectCore.setExpires
      @method
      @public
   */
  setExpires: function () {
    InjectCore.setExpires.apply(this, arguments);
  },
  /**
      Sets unique cache identifier for Inject.  This allows the parent page
      to "bust" the cache by invoking setCacheKey with a different value.
      @see InjectCore.setCacheKey
      @method
      @public
   */
  setCacheKey: function () {
    InjectCore.setCacheKey.apply(this, arguments);
  },
  /**
      Sets the cross-domain configuration.  The cross-domain configuration
      is an object consisting of two properties: relayHtml and relaySwf.  The
      HTML and SWF file should be located on the remote server (for example
      the CDN).
      @see InjectCore.setCrossDomain
      @method
      @public
   */
  setCrossDomain: function () {
    InjectCore.setCrossDomain.apply(this, arguments);
  },

  /**
      Sets the useSuffix user config. The useSuffix config tells the RulesEngine
      not to auto-append a .js extension. This is highly helpful in concatenated
      environments or environments with JS being generated programatically.
  */
  setUseSuffix: function (val) {
    InjectCore.setUseSuffix(val);
  },

  /**
   * Set the global AMD property. Setting this to "true" can disable
   * the global AMD detection. This is really useful in scenarios where
   * you anticipate mixing script tags with your loader framework
   */
  disableGlobalAMD: function (disable) {
    if (disable) {
      context.define = RequireContext.createDefine(null, null, true);
    }
    else {
      context.define = RequireContext.createDefine();
    }
  },

  /**
      Clears the local storage caches.
      @see InjectCore.clearCache
      @method
      @public
   */
  clearCache: proxy(InjectCore.clearCache, InjectCore),

  /**
      @see RulesEngine.addRule
      @method
      @deprecated
      @public
   */
  addRule: function () {
    RulesEngine.addRule.apply(RulesEngine, arguments);
  },

  /**
      @see RulesEngine.addModuleRule
      @method
      @public
   */
  addModuleRule: function () {
    RulesEngine.addModuleRule.apply(RulesEngine, arguments);
  },

  /**
      @see RulesEngine.addFileRule
      @method
      @public
   */
  addFileRule: function () {
    RulesEngine.addFileRule.apply(RulesEngine, arguments);
  },

  /**
      @see RulesEngine.addContentRule
      @method
      @public
   */
  addContentRule: function () {
    RulesEngine.addContentRule.apply(RulesEngine, arguments);
  },

  /**
      @see RulesEngine.addFetchRule
      @method
      @public
   */
  addFetchRule: function () {
    RulesEngine.addFetchRule.apply(RulesEngine, arguments);
  },

  /**
      @see RulesEngine.addPackage
      @method
      @public
   */
  addPackage: function () {
    RulesEngine.addPackage.apply(RulesEngine, arguments);
  },

  /**
   * Add a plugin to Inject, registering a rule and global functions
   * @see InjectCore.plugin
   * @method
   * @public
   */
  plugin: function () {
    var args = [].slice.call(arguments, 0);
    args.push(context.Inject);
    InjectCore.plugin.apply(InjectCore, args);
  },

  /**
      CommonJS and AMD require()
      @see InjectCore.createRequire
      @see <a href="http://wiki.commonjs.org/wiki/Modules/1.1">CommonJS require()</a>
      @see <a href="https://github.com/amdjs/amdjs-api/wiki/require">AMD require()</a>
      @method
      @public
   */
  require: RequireContext.createRequire(),
  /**
      AMD define()
      @see InjectCore.createDefine
      @see <a href="https://github.com/amdjs/amdjs-api/wiki/AMD">AMD define()</a>
      @method
      @public
   */
  define: RequireContext.createDefine(),
  /**
      The version of Inject.
      @type {String}
      @public
   */
  version: 'undefined'
};

/**
    CommonJS and AMD require()
    @see InjectCore.createRequire
    @see <a href="http://wiki.commonjs.org/wiki/Modules/1.1">CommonJS require()</a>
    @see <a href="https://github.com/amdjs/amdjs-api/wiki/require">AMD require()</a>
    @method
    @public
 */
context.require = context.Inject.require;

/**
    AMD define()
    @see InjectCore.createDefine
    @see <a href="https://github.com/amdjs/amdjs-api/wiki/AMD">AMD define()</a>
    @method
    @public
 */
context.define = context.Inject.define;