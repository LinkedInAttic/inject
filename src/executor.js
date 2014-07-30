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
 * The executor module handles the raw JS execution and sandboxing
 * of modules when they are ran. The resulting exports are cached
 * here for later. The executor is also the authority on what
 * modules have been AMD-defined, are broken, or contain circular
 * references.
 * @file
 **/
var Executor  = Fiber.extend(function() {

  var functionCount = 0;

  /**
   * the document head
   * @private
   * @type {boolean}
   */
  var docHead = false;

  /**
   * Determines if an object has its own property. Uses {} instead of a local
   * object in case the hasOwnProperty property has been overwritten
   * @method Executor.hasOwnProperty
   * @private
   * @param {Object} obj - the object to test for a property on
   * @param {String} prop - the prop to test for
   * @returns Boolean
   */
  function hasOwnProperty(obj, prop) {
    return {}.prototype.hasOwnProperty.call(obj, prop);
  }

  // capture document head
  try {
    docHead = document.getElementsByTagName('head')[0];
  } catch (e) {
    docHead = false;
  }

  /**
   * Creates a globally accessible object for eval purposes
   * This allows eval to work in the window scope, while still having
   * access to the local executor for module references
   * @function
   * @param {String} guid - a unique ID
   * @param {Executor} executor - an executor object for scoping purposes
   * @return {Object}
   */
  function createGlobalObject(guid, executor) {
    window[guid] = {
      defineExecutingModuleAs: function() {
        executor.defineExecutingModuleAs.apply(executor, arguments);
      },
      undefineExecutingModule: function() {
        executor.undefineExecutingModule.apply(executor, arguments);
      }
    };
    return window[guid];
  }

  /**
   * Delete a globally accessible object used by executor
   * @function
   * @param {String} guid - a unique ID
   */
  function removeGlobalObject(guid) {
    // IE8 won't allow deletion of window properties so the guid
    // will be set to undefined instead.
    try {
      delete window[guid];
    }
    catch(e) {
      window[guid] = undefined;
    }
  }

  /**
   * execute a javascript module after wrapping it in sandbox code
   * this way, the entire module process is encapsulated
   * The options contain:
   * <pre>
   * moduleId     - the id of the module
   * functionId   - the anonymous function id
   * preamble     - the sandbox preamble code
   * epilogue     - the sandbox epilogue code
   * originalCode - the original unmodified code
   * url          - the URL used to retrieve the module
   * </pre>
   * @function
   * @param {String} code - the code to execute
   * @param {Object} options - a collection of options
   */
  function executeJavaScriptModule(globalObject, env, code, functionId) {
    var meta = globalObject;
    var module = meta.module;
    var failed = false;
    var sourceString = IS_IE ? '' : '//@ sourceURL=' + module.uri;
    var result;
    var err;

    // add source string in sourcemap compatible browsers
    code = [code, sourceString].join('\n');

    // Parse file and catch any parse errors
    try {
      eval(code);
    }
    catch(ex) {
      // this file will fail when directly injected. We can leverage that to generate a
      // proper syntax error, removing the LinkJS dependency completely. While the debugging
      // is not as perfect, the 15k savings are well worth it. Window level reporting is
      // undisturbed by this change
      ex.message = 'Parse error in ' + module.id + ' (' + module.uri + ') please check for an uncaught error ' + ex.message;
      var scr = document.createElement('script');
      scr.src = module.uri;
      scr.type = 'text/javascript';
      docHead.appendChild(scr);
      return {
        __error: ex
      };
    }

    // We only reach here if there are no parse errors
    // We can now evaluate using either the eval()
    // method or just running the function we built.
    // if there is not a registered function in the _ namespace, there
    // must have been a syntax error. Firefox mandates an eval to expose it, so
    // we use that as the least common denominator
    if (env.config.sourceUrls) {
      // if sourceMap is enabled
      // create a version of our code that can be put through eval with the
      // sourcemap string enabled. This allows some browsers (Chrome and Firefox)
      // to properly see file names instead of just "eval" as the file name in inspectors
      var toExec = code.replace(/([\w\W]+?)=([\w\W]*\})[\w\W]*?$/, '$1 = ($2)();');
      toExec = [toExec, sourceString].join('\n');

      eval(toExec);

      if (module.__error) {
        module.__error.message = 'Runtime error in ' + module.id + '(' + module.uri + ') ' + module.__error.message;
      }
    }
    else {
      // there is an executable object AND source maps are off
      // just run it. Try/catch will capture exceptions and put them
      // into result.__error internally for us from the commonjs harness
      // NOTE: these all receive "-1" due to the semicolon auto added by the Executor at the end of
      // the preamble.
      // __EXCEPTION__.lineNumber - Inject._.modules.exec2.__error_line.lineNumber - 1
      globalObject.fn();

      if (module.__error) {
        module.__error.message = 'Runtime error in ' + module.id + '(' + module.uri + ') ' + module.__error.message;
      }
    }
  }

  return {
    /**
     * Create the executor and initialize its caches
     * @constructs Executor
     * @param {Object} env - The context to run in
     */
    init : function(env) {
      this.env = env;
      this.clearCaches();
    },

    /**
     * Clear all the caches for the executor
     * @method Executor.clearCaches
     * @public
     */
    clearCaches : function() {
      // cache of resolved exports
      this.cache = {};

      // any modules that had errors
      this.errors = {};

      // the stack of AMD define functions, because they "could" be anonymous
      this.anonymousAMDStack = [];
    },

    /**
     * Define the executing module by a moduleId and path.
     * when using AMD style defines with just CommonJS
     * wrappers, it's important to know what module we are
     * currently trying to run.
     * @method Executor.defineExecutingModuleAs
     * @param {string} moduleId - the module ID being ran
     * @param {string} path - the path for the current module
     * @public
     */
    defineExecutingModuleAs : function(moduleId, path) {
      return this.anonymousAMDStack.push({
        id : moduleId,
        path : path
      });
    },

    /**
     * Remove the currently executing module from the define stack
     * @method Executor.undefineExecutingModule
     * @public
     */
    undefineExecutingModule : function() {
      return this.anonymousAMDStack.pop();
    },

    /**
     * Get the current executing AMD module
     * @method Executor.getCurrentExecutingAMD
     * @public
     * @returns {object} the id and path of the current module
     */
    getCurrentExecutingAMD : function() {
      return this.anonymousAMDStack[this.anonymousAMDStack.length - 1];
    },

    /**
     * Get the cached version of a module ID, accounting
     * for any possible aliases. If an alias exists,
     * the cache is also updated
     * @method Executor.getFromCache
     * @param {String} idAlias - an ID or alias to get
     * @returns {Object} module at the ID or alias
     */
    getFromCache : function(idAlias) {
      var alias = this.env.rulesEngine.getOriginalName(idAlias);
      var err;
      var errorMessage;
      var e;
      var module;
      var stackMode;
      var mainTrace;
      var offsetTrace;
      var mainTracePieces;
      var offsetTracePieces;
      var actualLine;
      var actualChar;
      var tracePieces = /([\d]*)?:([\d]+)\)?$/;

      if (HAS_OWN_PROPERTY.call(this.errors, idAlias) && this.errors[idAlias]) {
        err = this.errors[idAlias];
      }
      else if (alias && HAS_OWN_PROPERTY.call(this.errors, alias) && this.errors[alias]) {
        err = this.errors[alias];
      }

      // check by moduleID
      if (this.cache[idAlias]) {
        module = this.cache[idAlias];
      }
      else if(alias && this.cache[alias]) {
        this.cache[idAlias] = this.cache[alias];
        module = this.cache[alias];
      }

      if (err) {
        errorMessage = 'module ' + idAlias + ' failed to load successfully';
        errorMessage += (err) ? ': ' + err.message : '';

        // building a better stack trace
        if (module && module.__error_line) {
          // runtime errors need better stack trace
          mainTrace = printStackTrace({e: err});
          offsetTrace = printStackTrace({e: module.__error_line});

          if (!mainTrace[1] || mainTrace[1].indexOf(':') === -1) {
            // traces were not usable. See issue #301
            errorMessage = '(unparsable error) ' + err.message;
          }
          else {
            mainTracePieces = mainTrace[1].match(tracePieces);
            offsetTracePieces = offsetTrace[1].match(tracePieces);

            if (typeof mainTracePieces[1] == 'undefined') {
              // phantomJS returns '   at :<line>'. We need to test for missing pieces
              // all traces at least give us the line
              actualLine = mainTracePieces[2] - offsetTracePieces[2] - 1;
              actualChar = '--';
            }
            else {
              actualLine = mainTracePieces[1] - offsetTracePieces[1] - 1;
              actualChar = mainTracePieces[2];
            }

            errorMessage = errorMessage + ' @ Line: ' + actualLine + ' Column: ' + actualChar + ' ';
          }
        }

        err.message = errorMessage;

        throw err;
      }

      return module || null;
    },

    /**
     * Create a module if it doesn't exist, and store it locally
     * @method Executor.createModule
     * @param {string} moduleId - the module identifier
     * @param {string} path - the module's proposed URL
     * @public
     * @returns {Object} - a module object representation
     */
    createModule : function(moduleId, qualifiedId, path) {
      var module;

      if (!(/\!/.test(moduleId)) && this.cache[moduleId]) {
        this.cache[qualifiedId] = this.cache[moduleId];
        this.cache[moduleId].qualifiedIds[qualifiedId] = 1;
        return this.cache[moduleId];
      }

      module = {};
      module.id = moduleId || null;
      module.qualifiedIds = {};
      module.uri = path || null;
      module.exports = {};
      module.exec = false;
      module.setExports = function(xobj) {
        var name;
        for (name in module.exports) {
          if (Object.hasOwnProperty.call(module.exports, name)) {
            debugLog('cannot setExports when exports have already been set. setExports skipped');
            return;
          }
        }
        switch (typeof(xobj)) {
          case 'object':
            // objects are enumerated and added
            for (name in xobj) {
              module.exports[name] = xobj[name];
            }
            break;
          case 'function':
            module.exports = xobj;
            break;
          default:
            // non objects are written directly, blowing away exports
            module.exports = xobj;
            break;
        }
      };

      // Important AMD item. Do not store any IDs with an !
      if (!(/\!/.test(moduleId))) {
        this.cache[moduleId] = module;
        this.cache[moduleId].qualifiedIds[qualifiedId] = 1;
      }

      this.cache[qualifiedId] = module;
      this.cache[qualifiedId].qualifiedIds[moduleId] = 1;

      return module;
    },

    /**
     * Get the module matching the specified Identifier
     * @method Executor.getModule
     * @param {string} moduleId - the module ID
     * @public
     * @returns {object} the module at the identifier
     */
    getModule : function(moduleId, undef) {
      return this.getFromCache(moduleId) || undef;
    },

    /**
     * Build a sandbox around and execute a module
     * @method Executor.runModule
     * @param {object} module - the module
     * @param {string} code - the code to execute
     * @returns {Object} a module object
     * @public
     */
    runModule : function(module, code) {
      debugLog('Executor', 'executing ' + module.uri);

      var functionId = 'exec' + (functionCount++);
      var globalPath = this.env.instance + '_' + functionId;
      var globalObject = createGlobalObject(globalPath, this);

      var qualifiedIds = [];
      for (var name in module.qualifiedIds) {
        if (module.qualifiedIds.hasOwnProperty(name)) {
          qualifiedIds.push(name);
        }
      }

      globalObject.module = module;
      globalObject.require = this.env.requireContext.createRequire(module.id, module.uri, qualifiedIds);
      globalObject.define = this.env.requireContext.createInlineDefine(module, globalObject.require);

      function swapUnderscoreVars(text) {
        return text.replace(/__MODULE_ID__/g, module.id)
          .replace(/__MODULE_URI__/g, module.uri)
          .replace(/__FUNCTION_ID__/g, functionId)
          .replace(/__REACHABLE_PATH__/g, globalPath);
      }

      var header = swapUnderscoreVars(commonJSHeader);
      var footer = swapUnderscoreVars(commonJSFooter);
      var runCommand = ([header, ';', code, footer]).join('\n');

      executeJavaScriptModule(globalObject, this.env, runCommand, functionId);

      // if a global error object was created
      if (module.__error) {
        // context[NAMESPACE].clearCache();
        // exit early, this module is broken
        debugLog('Executor', 'broken', module.id, module.uri, module.exports);
        this.errors[module.id] = module.__error;
      }

      removeGlobalObject(globalPath);

      debugLog('Executor', 'executed', module.id, module.uri, module.exports);
    }
  };
});
