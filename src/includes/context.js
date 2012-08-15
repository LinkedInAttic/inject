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

/**
    This object contains the public interface for Inject.
    @class
    @type {Object}
    @global
 */
context.Inject = {
  /**
      This object and its properties are meant solely for consumption
      @private
   */
  INTERNAL: {
    // used by the executor. these let inject know the module that is currently running
    defineExecutingModuleAs: proxy(Executor.defineExecutingModuleAs, Executor),
    undefineExecutingModule: proxy(Executor.undefineExecutingModule, Executor),
    createModule: proxy(Executor.createModule, Executor),
    setModuleExports: function() {},

    // a hash of publicly reachable module sandboxes ie exec0, exec1...
    execute: {},

    // a globally available require() call for the window and base page
    globalRequire: globalRequire,

    // creates require and define methods as passthrough
    createRequire: proxy(InjectCore.createRequire, InjectCore),
    createDefine: proxy(InjectCore.createDefine, InjectCore)
  },
  /**
      Exposes easyXDM API for doing cross-domain messaging.
      @see <a href="http://www.easyxdm.net">easyXDM</a>
      @public
   */
  easyXDM: easyXDM,
  /**
      Clears any locally cached modules, downloads and local storage.
      @see InjectCore#reset
      @method
      @public
   */
  reset: proxy(InjectCore.reset, InjectCore),
  /**
      Enables debugging options.
      @see InjectCore#enableDebug
      @method
      @public
   */
  enableDebug: function() {
    InjectCore.enableDebug.apply(this, arguments);
  },
  /**
      @see RulesEngine#toUrl
      @method
      @public
   */
  toUrl: function() {
    RulesEngine.toUrl.apply(this, arguments);
  },
  /**
      Sets base path for all module includes.
      @see InjectCore#setModuleRoot
      @method
      @public
   */
  setModuleRoot: function() {
    InjectCore.setModuleRoot.apply(this, arguments);
  },
  /**
      Set a time for how long to preserve items in cache.
      The default time is 300 seconds.
      @see InjectCore#setExpires
      @method
      @public
   */
  setExpires: function() {
    InjectCore.setExpires.apply(this, arguments);
  },
  /**
      Sets unique cache identifier for Inject.  This allows the parent page
      to "bust" the cache by invoking setCacheKey with a different value.
      @see InjectCore#setCacheKey
      @method
      @public
   */
  setCacheKey: function() {
    InjectCore.setCacheKey.apply(this, arguments);
  },
  /**
      Sets the cross-domain configuration.  The cross-domain configuration
      is an object consisting of two properties: relayHtml and relaySwf.  The
      HTML and SWF file should be located on the remote server (for example
      the CDN).
      @see InjectCore#setCrossDomain
      @method
      @public
   */
  setCrossDomain: function() {
    InjectCore.setCrossDomain.apply(this, arguments);
  },
  /**
      Clears the local storage caches.
      @see InjectCore#clearCache
      @method
      @public
   */
  clearCache: proxy(InjectCore.clearCache, InjectCore),
  /**
      @see RulesEngine#manifest
      @method
      @public
   */
  manifest: function() {
    RulesEngine.manifest.apply(RulesEngine, arguments);
  },
  /**
   * @see RulesEngine#addRule
   * @method
   * @public
   */
  addRule: function() {
    RulesEngine.addRule.apply(RulesEngine, arguments);
  },
  /**
      CommonJS and AMD require()
      @see InjectCore#createRequire
      @see <a href="http://wiki.commonjs.org/wiki/Modules/1.1">CommonJS require()</a>
      @see <a href="https://github.com/amdjs/amdjs-api/wiki/require">AMD require()</a>
      @method
      @public
   */
  require: InjectCore.createRequire(),
  /**
      AMD define()
      @see InjectCore#createDefine
      @see <a href="https://github.com/amdjs/amdjs-api/wiki/AMD">AMD define()</a>
      @method
      @public
   */
  define: InjectCore.createDefine(),
  /**
      The version of Inject.
      @type {String}
      @public
   */
  version: INJECT_VERSION
};

/**
    CommonJS and AMD require()
    @see InjectCore#createRequire
    @see <a href="http://wiki.commonjs.org/wiki/Modules/1.1">CommonJS require()</a>
    @see <a href="https://github.com/amdjs/amdjs-api/wiki/require">AMD require()</a>
    @method
    @public
 */
context.require = context.Inject.INTERNAL.createRequire();

/**
    AMD define()
    @see InjectCore#createDefine
    @see <a href="https://github.com/amdjs/amdjs-api/wiki/AMD">AMD define()</a>
    @method
    @public
 */
context.define = context.Inject.INTERNAL.createDefine();