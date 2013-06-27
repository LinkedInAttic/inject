/*jshint evil:true */
/*global context:true, document:true, TraceKit:true */

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
var Executor;
(function() {

  var moduleFailureCache = {};

  /**
   * create a script node containing code to execute when
   * placed into the page. IE behaves differently from other
   * browsers, which is why the logic has been encapsulated into
   * a function.
   * @function
   * @param {String} code - the code to create a node with
   * @private
   */
  function createEvalScript(code) {
    var scr = document.createElement('script');
    scr.type = 'text/javascript';
    try {
      scr.text = code;
    } catch (e) {
      try {
        scr.innerHTML = code;
      } catch (ee) {
        return false;
      }
    }
    return scr;
  }

  /**
   * remove an inserted script node from the page.
   * It is put into a setTimeout call so that it will
   * happen after all other code in queue has completed.
   * @function
   * @param {node} node - the HTML node to clean
   * @private
   */
  function cleanupEvalScriptNode(node) {
    context.setTimeout(function() {
      if (docHead) {
        return docHead.removeChild(node);
      }
    });
  }

  /**
   * the document head
   * @private
   * @type {boolean}
   */
  var docHead = false;

  // capture document head
  try {
    docHead = document.getElementsByTagName('head')[0];
  } catch (e) {
    docHead = false;
  }

  /*
   * Set up TraceKit error handler.
   * Captures the error report created by
   * TraceKit and passes it to our global
   * error handler.
   */
  TraceKit.report.subscribe(function(errorReport) {
    // passes through to Inject emitter right now
    Inject.emit(errorReport);
  });

  /**
   * Error handler called in executor.js
   * Caches the original error and then calls
   * the TraceKit error handler.
   * @function
   * @param {Error} - the error to be handled
   * @param {moduleId} - module which caused Error to be thrown
   */
  function sendToTraceKit(err, moduleId) {
    moduleFailureCache[moduleId] = err;
    TraceKit.report(err);
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
  function executeJavaScriptModule(code, options) {
    var failed = false;
    var sourceString = IS_IE ? '' : '//@ sourceURL=' + options.url;
    var result;
    var err;

    options = {
      moduleId : options.moduleId || null,
      functionId : options.functionId || null,
      preamble : options.preamble || '',
      preambleLength : options.preamble.split('\n').length,
      epilogue : options.epilogue || '',
      epilogueLength : options.epilogue.split('\n').length,
      originalCode : options.originalCode || code,
      url : options.url || null
    };

    // add source string in sourcemap compatible browsers
    code = [code, sourceString].join('\n');

    try {
      LinkJS.parse('function linktest() {' + options.originalCode + '\n}');
      eval(code);
    } catch(e) {
      var linkJsLine;
      linkJsLine = parseInt(e.message.replace(/.+? at line (.+)$/, '$1'), 10);
      err = new Error('Parse error in ' + options.moduleId + ' (' + options.url + ') at line ' + linkJsLine);
      try {
        throw err;
      } catch(tkerr) {
        failed = true;
        sendToTraceKit(tkerr, options.moduleId);
      }
    }

    var lineException, adjustedLineNumber;
    // if there were no errors, tempErrorHandler never ran and therefore
    // failed is false. We can now evaluate using either the eval()
    // method or just running the function we built.
    // if there is not a registered function in the INTERNAL namespace, there
    // must have been a syntax error. Firefox mandates an eval to expose it, so
    // we use that as the least common denominator
    if (!failed) {
      if (userConfig.debug.sourceMap) {
        // if sourceMap is enabled
        // create a version of our code that can be put through eval with the
        // sourcemap string enabled. This allows some browsers (Chrome and Firefox)
        // to properly see file names instead of just "eval" as the file name in inspectors
        var toExec = code.replace(/([\w\W]+?)=([\w\W]*\})[\w\W]*?$/, '$1 = ($2)();');
        toExec = [toExec, sourceString].join('\n');
        // generate an exception and capture the line number for later
        // you must keep try/catch and this eval on one line
        try {toExec.undefined_function();} catch(ex) {lineException = ex;}eval(toExec);
        result = context.Inject.INTERNAL.execute[options.functionId];
      } else {
        // there is an executable object AND source maps are off
        // just run it. Try/catch will capture exceptions and put them
        // into result.error internally for us from the commonjs harness
        result = context.Inject.INTERNAL.execute[options.functionId]();
      }
      // set the error object using our standard method
      if (result.error) {
        debugger;
        if (result.error.lineNumber) {
          // firefox supports lineNumber as a property
          adjustedLineNumber = result.error.lineNumber - options.preambleLength;
          adjustedLineNumber -= (lineException) ? lineException.lineNumber: 0;
        } else if (result.error.stack) {
          // chrome supports structured stack messages
          adjustedLineNumber = result.error.stack.toString().replace(/\n/g, ' ').replace(/.+?at .+?:(\d+).*/, '$1');
          adjustedLineNumber -= options.preambleLength;
          adjustedLineNumber -= (lineException) ? parseInt(lineException.stack.toString().replace(/\n/g, ' ').replace(/.+?at .+?:(\d+).*/, '$1'), 10) : 0;
        } else if (result.error.line) {
          adjustedLineNumber = result.error.line - options.preambleLength;
          adjustedLineNumber -= (lineException) ? lineException.line : 0;
        } else {
          adjustedLineNumber = 'unknown';
        }
        err = new Error('Runtime error in ' + options.moduleId + '(' + options.url + ') at line ' + adjustedLineNumber);
        err.stack = result.error.stack;
        err.lineNumber = result.error.lineNumber;
        sendToTraceKit(err, options.moduleId);
      }
    }

    // clean up the function or object we globally created if it exists
    if (context.Inject.INTERNAL.execute[options.functionId]) {
      delete context.Inject.INTERNAL.execute[options.functionId];
    }

    // return the results
    return (failed) ? {
      error : true
    } : result;
  }

  var AsStatic = Fiber.extend(function() {
    var functionCount = 0;
    return {
      /**
       * Create the executor and initialize its caches
       * @constructs Executor
       */
      init : function() {
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

        // cache of executed modules (true/false)
        this.executed = {};

        // cache of "broken" modules (true/false)
        this.broken = {};

        // cache of "circular" modules (true/false)
        this.circular = {};

        // AMD style defined modules (true/false)
        this.defined = {};

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
       * Assigning a module puts it into a special scope. Since we cannot
       * predict what was going to be put here, we have to assume the calling
       * context knows what the intent was. This is primarily used in AMD
       * flows, but is made generic should someone else want to force assign
       * exports through an addRule mechanism
       * @method Executor.assignModule
       * @param {String} parentName - the name of the parent module
       * @param {String} moduleName - the name of the module that was invoked
       * @param {String} path - a path for module completeness (module.uri) sake
       * @param {Object} exports - the item to assign to module.exports
       */
      assignModule : function(parentName, moduleName, path, exports) {
        var module = Executor.createModule(parentName + '^^^' + moduleName, path);
        module.exports = exports;
      },

      /**
       * Retrieves a module from an assignment location
       * Modules are placed in a special namespace when assigned.
       * This allows them to be retrieved without polluting the main
       * namespaces
       * @method Executor.getAssignedModule
       * @param {String} parentName - the name of the parent module
       * @param {String} moduleName - the name of the module to retrieve
       * @returns {Object} the module object
       */
      getAssignedModule : function(parentName, moduleName) {
        return this.getModule(parentName + '^^^' + moduleName);
      },

      /**
       * run all items within the tree, then run the provided callback
       * If we encounter any modules that are paused, we BLOCK and wait
       * for their resolution
       * @method Executor.runTree
       * @param {TreeNode} root - the root TreeNode to run execution on
       * @param {Object} files - a hash of filename / contents
       * @param {Function} callback - a callback to run when the tree is executed
       * @public
       */
      runTree : function(root, files, callback) {
        // do a post-order traverse of files for execution
        var returns = [];
        root.postOrder(function(node) {
          if (!node.getValue().name) {
            return;
            // root node
          }
          var name = node.getValue().name;
          var path = node.getValue().path;
          var file = files[name];
          var resolvedId = node.getValue().resolvedId;
          var module;

          Executor.createModule(resolvedId, path);
          if (!node.isCircular()) {
            // note: we use "name" here, because of CommonJS Spec 1.0 Modules
            // the relative includes we find must be relative to "name", not the
            // resovled name
            module = Executor.runModule(resolvedId, file, path);
            returns.push(module);
          }
        });

        callback(returns);
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
        // check by moduleID
        if (this.cache[idAlias]) {
          return this.cache[idAlias];
        }

        // check by alias (updates module ID reference)
        var alias = RulesEngine.getOriginalName(idAlias);
        if (alias && this.cache[alias]) {
          this.cache[idAlias] = this.cache[alias];
        }

        return this.cache[idAlias] || null;
      },

      /**
       * Create a module if it doesn't exist, and store it locally
       * @method Executor.createModule
       * @param {string} moduleId - the module identifier
       * @param {string} path - the module's proposed URL
       * @public
       * @returns {Object} - a module object representation
       */
      createModule : function(moduleId, path) {
        var module;

        if (!this.getFromCache(moduleId)) {
          module = {};
          module.id = moduleId || null;
          module.uri = path || null;
          module.exports = {};
          module.error = null;
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

          if (moduleId) {
            this.cache[moduleId] = module;
          }
        }

        if (moduleId) {
          return this.cache[moduleId];
        } else {
          return module;
        }
      },

      /**
       * Check if a module is an AMD style define
       * @method Executor.isModuleDefined
       * @param {string} moduleId - the module ID
       * @public
       * @returns {boolean} if the module is AMD defined
       */
      isModuleDefined : function(moduleId) {
        return this.defined[moduleId];
      },

      /**
       * Flag a module as defined AMD style
       * @method Executor.flagModuleAsDefined
       * @param {string} moduleId - the module ID
       * @public
       */
      flagModuleAsDefined : function(moduleId) {
        this.defined[moduleId] = true;
      },

      /**
       * Flag a module as broken
       * @method Executor.flagModuleAsBroken
       * @param {string} moduleId - the module ID
       * @public
       */
      flagModuleAsBroken : function(moduleId) {
        this.broken[moduleId] = true;
      },

      /**
       * Flag a module as circular
       * @method Executor.flagModuleAsCircular
       * @param {string} moduleId - the module ID
       * @public
       */
      flagModuleAsCircular : function(moduleId) {
        this.circular[moduleId] = true;
      },

      /**
       * returns if the module is circular or not
       * @method Executor.isModuleCircular
       * @param {string} moduleId - the module ID
       * @public
       * @returns {boolean} true if the module is circular
       */
      isModuleCircular : function(moduleId) {
        return this.circular[moduleId];
      },

      /**
       * Get the module matching the specified Identifier
       * @method Executor.getModule
       * @param {string} moduleId - the module ID
       * @public
       * @returns {object} the module at the identifier
       */
      getModule : function(moduleId) {
        if (this.broken[moduleId] && this.broken.hasOwnProperty(moduleId)) {
          var e = new Error('module ' + moduleId + ' failed to load successfully');
          e.originalError = moduleFailureCache[moduleId];
          throw e;
        }

        // return from the cache (or its alias location)
        return this.getFromCache(moduleId) || null;
      },

      /**
       * Build a sandbox around and execute a module
       * @method Executor.runModule
       * @param {string} moduleId - the module ID
       * @param {string} code - the code to execute
       * @param {string} path - the URL for the module to run
       * @returns {Object} a module object
       * @public
       */
      runModule : function(moduleId, code, path) {
        debugLog('Executor', 'executing ' + path);
        // check cache
        if (this.cache[moduleId] && this.executed[moduleId]) {
          return this.cache[moduleId];
        }

        // check AMD define-style cache
        if (this.cache[moduleId] && this.defined[moduleId]) {
          return this.cache[moduleId];
        }

        var functionId = 'exec' + (functionCount++);

        function swapUnderscoreVars(text) {
          return text.replace(/__MODULE_ID__/g, moduleId).replace(/__MODULE_URI__/g, path).replace(/__FUNCTION_ID__/g, functionId).replace(/__INJECT_NS__/g, NAMESPACE);
        }

        var header = swapUnderscoreVars(commonJSHeader);
        var footer = swapUnderscoreVars(commonJSFooter);
        var runCommand = ([header, ';', code, footer]).join('\n');
        var result;

        result = executeJavaScriptModule(runCommand, {
          moduleId : moduleId,
          functionId : functionId,
          preamble : header,
          epilogue : footer,
          originalCode : code,
          url : path
        });

        // if a global error object was created
        if (result && result.error) {
          context[NAMESPACE].clearCache();
          // exit early, this module is broken
          this.executed[moduleId] = true;
          Executor.flagModuleAsBroken(moduleId);
          debugLog('Executor', 'broken', moduleId, path, result);
          return;
        }

        // cache the result (IF NOT AMD)
        if (!DEFINE_EXTRACTION_REGEX.test(code)) {
          this.cache[moduleId] = result;
        }

        this.executed[moduleId] = true;
        debugLog('Executor', 'executed', moduleId, path, result);

        // return the result
        return result;
      }
    };
  });
  Executor = new AsStatic();
})();
