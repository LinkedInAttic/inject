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

  /**
   * the document head
   * @private
   * @type {boolean}
   */
  var docHead = false;

  /**
   * on error, this offset represents the delta between actual
   * errors and the reported line
   * @private
   * @type {int}
   */
  var onErrorOffset = 0;

  /**
   * A test script designed to generate a known error
   * @private
   * @type {int}
   */
  var testScript = 'function Inject_Test_Known_Error() {\n  function nil() {}\n  nil("Known Syntax Error Line 3";\n}';
  
  /**
   * the old onerror object for restoring
   * @private
   * @type {*}
   */
  var initOldError = context.onerror;

  /**
   * the test script node is a node containing the test script,
   * which will trigger an error on injection
   * @private
   * @type {Node}
   */
  var testScriptNode = createEvalScript(testScript);

  // capture document head
  try { docHead = document.getElementsByTagName("head")[0]; }
  catch(e) { docHead = false; }

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
    var scr = document.createElement("script");
    scr.type = "text/javascript";
    try { scr.text = code; } catch (e) {
    try { scr.innerHTML = code; } catch (ee) {
      return false;
    }}
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

  // build a test script and ensure it works
  context.onerror = function(err, where, line) {
    onErrorOffset = 3 - line;
    cleanupEvalScriptNode(testScriptNode);
    return true;
  };
  if (docHead) {
    docHead.appendChild(testScriptNode);
  }
  context.onerror = initOldError;
  // test script completion

  /**
   * extract line numbers from an exception.
   * it turns out that an exception can have an error line
   * in multiple places. If there is e.lineNumber, then we
   * can use that. Otherwise, we deconstruct the stack and
   * locate the trace line with a line number
   * @function
   * @param {Exception} e - the exception to get a line number from
   * @private
   */
  function getLineNumberFromException(e) {
    var lines;
    var phrases;
    if (typeof(e.lineNumber) !== "undefined" && e.lineNumber !== null) {
      return e.lineNumber;
    }
    if (typeof(e.line) !== "undefined" && e.line !== null) {
      return e.line;
    }
    if (e.stack) {
      lines = e.stack.split("\n");
      phrases = lines[1].split(":");
      return phrases[phrases.length - 2];
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
  function executeJavaScriptModule(code, options) {
    var errorObject = null;
    var sourceString = IS_IE ? "" : "//@ sourceURL=" + options.url;
    var result;

    options = {
      moduleId: options.moduleId || null,
      functionId: options.functionId || null,
      preamble: options.preamble || "",
      preambleLength: options.preamble.split("\n").length + 1,
      epilogue: options.epilogue || "",
      epilogueLength: options.epilogue.split("\n").length + 1,
      originalCode: options.originalCode || code,
      url: options.url || null
    };

    // add source string in sourcemap compatible browsers
    code = [code, sourceString].join("\n");

    /**
     * a temp error handler that lasts for the duration of this code
     * run. It allows us to catch syntax error handling in this specific
     * code execution. It sets an errorObject via closure so that
     * we know we entered an error state
     * @function
     * @param {string} err - the error string
     * @param {string} where - the file with the error
     * @param {int} line - the line number of the error
     * @param {string} type - the type of error (runtime, parse)
     */
    var tempErrorHandler = function(err, where, line, type) {
      var actualErrorLine =  line - options.preambleLength;
      var originalCodeLength = options.originalCode.split("\n").length;
      var message = "";

      switch(type) {
        case "runtime":
          message = "Runtime error in " + options.moduleId + " (" + options.url + ") on line " + actualErrorLine + ":\n  " + err;
          break;
        case "parse":
        default:
          // end of input test
          actualErrorLine = (actualErrorLine > originalCodeLength) ? originalCodeLength : actualErrorLine;
          message = "Parsing error in " + options.moduleId + " (" + options.url + ") on line " + actualErrorLine + ":\n  " + err;
      }

      // set the error object global to the executor's run
      errorObject = new Error(message);
      errorObject.line = actualErrorLine;
      errorObject.stack = null;

      return true;
    };

    // set global onError handler
    // insert script - catches parse errors
    context.onerror = tempErrorHandler;
    var scr = createEvalScript(code);
    if (scr && docHead) {
      docHead.appendChild(scr);
      cleanupEvalScriptNode(scr);
    }

    // if there were no errors, tempErrorHandler never ran and therefore
    // errorObject was never set. We can now evaluate using either the eval()
    // method or just running the function we built.
    // if there is not a registered function in the INTERNAL namespace, there
    // must have been a syntax error. Firefox mandates an eval to expose it, so
    // we use that as the least common denominator
    if (!errorObject) {
      if (!context.Inject.INTERNAL.execute[options.functionId] || userConfig.debug.sourceMap) {
        // source mapping means we will take the same source as before,
        // add a () to the end to make it auto execute, and shove it through
        // eval. This means we are doing dual eval (one for parse, one for
        // runtime) when sourceMap is enabled. Some people really want their
        // debug.
        var toExec = code.replace(/([\w\W]+?)=([\w\W]*})[\w\W]*?$/, "$1 = ($2)();");
        var relativeE;
        toExec = [toExec, sourceString].join("\n");
        if (!context.Inject.INTERNAL.execute[options.functionId]) {
          // there is nothing to run, so there must have been an uncaught
          // syntax error (firefox). 
          try {
            try { eval("+\n//@ sourceURL=Inject-Executor-line.js"); } catch (ee) { relativeE = ee; }
            eval(toExec);
          }
          catch(e) {
            if (e.lineNumber && relativeE.lineNumber) {
              e.lineNumber = e.lineNumber - relativeE.lineNumber + 1;
            }
            else {
              e.lineNumber = getLineNumberFromException(e);
            }
            tempErrorHandler(e.message, null, e.lineNumber, "parse")
          }
        }
        else {
          // again, we are creating a "relativeE" to capture the eval line
          // this allows us to get accurate line numbers in firefox
          try { eval("+\n//@ sourceURL=Inject-Executor-line.js"); } catch (ee) { relativeE = ee; }
          eval(toExec);
        }
        
        if (context.Inject.INTERNAL.execute[options.functionId]) {
          result = context.Inject.INTERNAL.execute[options.functionId];
          // set the error object using our standard method
          // result.error will be later overwritten with a clean and readable Error()
          if (result.error) {
            if (result.error.lineNumber && relativeE.lineNumber) {
              result.error.lineNumber = result.error.lineNumber - relativeE.lineNumber;
            }
            else {
              result.error.lineNumber = getLineNumberFromException(result.error);
            }
            tempErrorHandler(result.error.message, null, result.error.lineNumber, "runtime");
          }
        }
      }
      else {
        // just run it. Try/catch will capture exceptions and put them
        // into result.error for us from commonjs harness
        result = context.Inject.INTERNAL.execute[options.functionId]();
        if (result.error) {
          tempErrorHandler(result.error.message, null, getLineNumberFromException(result.error), "runtime");
        }
      }
    }

    // if we have an error object, we should attach it to the result
    // if there is no result, make an empty shell so we can test for
    // result.error in other code.
    if (errorObject) {
      if (!result) {
        result = {};
      }
      result.error = errorObject;
    }

    // clean up our error handler
    context.onerror = initOldError;

    // clean up the function or object we globally created if it exists
    if(context.Inject.INTERNAL.execute[options.functionId]) {
      delete context.Inject.INTERNAL.execute[options.functionId];
    }

    // return the results
    return result;
  }

  var AsStatic = Class.extend(function() {
    var functionCount = 0;
    return {
      /**
       * Create the executor and initialize its caches
       * @constructs Executor
       */
      init: function() {
        this.clearCaches();
      },

      /**
       * Clear all the caches for the executor
       * @method Executor.clearCaches
       * @public
       */
      clearCaches: function() {
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
      defineExecutingModuleAs: function(moduleId, path) {
        return this.anonymousAMDStack.push({
          id: moduleId,
          path: path
        });
      },

      /**
       * Remove the currently executing module from the define stack
       * @method Executor.undefineExecutingModule
       * @public
       */
      undefineExecutingModule: function() {
        return this.anonymousAMDStack.pop();
      },

      /**
       * Get the current executing AMD module
       * @method Executor.getCurrentExecutingAMD
       * @public
       * @returns {object} the id and path of the current module
       */
      getCurrentExecutingAMD: function() {
        return this.anonymousAMDStack[this.anonymousAMDStack.length - 1];
      },

      /**
       * run all items within the tree, then run the provided callback
       * @method Executor.runTree
       * @param {TreeNode} root - the root TreeNode to run execution on
       * @param {Object} files - a hash of filename / contents
       * @param {Function} callback - a callback to run when the tree is executed
       * @public
       */
      runTree: function(root, files, callback) {
        // do a post-order traverse of files for execution
        var returns = [];
        root.postOrder(function(node) {
          if (!node.getValue().name) {
            return; // root node
          }
          var name = node.getValue().name;
          var path = node.getValue().path;
          var file = files[name];
          var resolvedId = node.getValue().resolvedId;
          // var resolvedName = (node.getParent())
          //                  ? RulesEngine.resolveIdentifier(name, node.getParent().getValue().name)
          //                  : resolvedId;
          var pointcuts = RulesEngine.getPointcuts(path, true);
          Executor.createModule(resolvedId, path);
          if (!node.isCircular()) {
            // note: we use "name" here, because of CommonJS Spec 1.0 Modules
            // the relative includes we find must be relative to "name", not the
            // resovled name
            returns.push(Executor.runModule(resolvedId, file, path, pointcuts));
          }
        });
        // all files are executed
        callback(returns);
      },

      /**
       * Create a module if it doesn't exist, and store it locally
       * @method Executor.createModule
       * @param {string} moduleId - the module identifier
       * @param {string} path - the module's proposed URL
       * @public
       * @returns {Object} - a module object representation
       */
      createModule: function(moduleId, path) {
        var module;
        if (!this.cache[moduleId]) {
          module = {};
          module.id = moduleId || null;
          module.uri = path || null;
          module.exports = {};
          module.error = null;
          module.setExports = function(xobj) {
            for (var name in module.exports) {
              debugLog("cannot setExports when exports have already been set. setExports skipped");
              return;
            }
            switch(typeof(xobj)) {
              case "object":
                // objects are enumerated and added
                for (var name in xobj) {
                  module.exports[name] = xobj[name];
                }
                break;
              case "function":
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
        }
        else {
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
      isModuleDefined: function(moduleId) {
        return this.defined[moduleId];
      },

      /**
       * Flag a module as defined AMD style
       * @method Executor.flagModuleAsDefined
       * @param {string} moduleId - the module ID
       * @public
       */
      flagModuleAsDefined: function(moduleId) {
        this.defined[moduleId] = true;
      },

      /**
       * Flag a module as broken
       * @method Executor.flagModuleAsBroken
       * @param {string} moduleId - the module ID
       * @public
       */
      flagModuleAsBroken: function(moduleId) {
        this.broken[moduleId] = true;
      },

      /**
       * Flag a module as circular
       * @method Executor.flagModuleAsCircular
       * @param {string} moduleId - the module ID
       * @public
       */
      flagModuleAsCircular: function(moduleId) {
        this.circular[moduleId] = true;
      },

      /**
       * returns if the module is circular or not
       * @method Executor.isModuleCircular
       * @param {string} moduleId - the module ID
       * @public
       * @returns {boolean} true if the module is circular
       */
      isModuleCircular: function(moduleId) {
        return this.circular[moduleId];
      },

      /**
       * Get the module matching the specified Identifier
       * @method Executor.getModule
       * @param {string} moduleId - the module ID
       * @public
       * @returns {object} the module at the identifier
       */
      getModule: function(moduleId) {
        if (this.broken[moduleId]) {
          throw new Error("module "+moduleId+" failed to load successfully");
        }
        return this.cache[moduleId] || null;
      },

      /**
       * Build a sandbox around and execute a module
       * @method Executor.runModule
       * @param {string} moduleId - the module ID
       * @param {string} code - the code to execute
       * @param {string} path - the URL for the module to run
       * @param {object} pointcuts - the AOP pointcuts for the module
       * @public
       */
      runModule: function(moduleId, code, path, pointcuts) {
        debugLog("Executor", "executing " + path);
        // check cache
        if (this.cache[moduleId] && this.executed[moduleId]) {
          return this.cache[moduleId];
        }

        // check AMD define-style cache
        if (this.cache[moduleId] && this.defined[moduleId]) {
          return this.cache[moduleId];
        }

        var functionId = "exec" + (functionCount++);
        var header = commonJSHeader.replace(/__MODULE_ID__/g, moduleId)
                                   .replace(/__MODULE_URI__/g, path)
                                   .replace(/__FUNCTION_ID__/g, functionId)
                                   .replace(/__INJECT_NS__/g, NAMESPACE)
                                   .replace(/__POINTCUT_BEFORE__/g, pointcuts.before || "");
        var footer = commonJSFooter.replace(/__INJECT_NS__/g, NAMESPACE)
                                   .replace(/__POINTCUT_AFTER__/g, pointcuts.after || "");
        var runCommand = ([header, ";", code, footer]).join("\n");
        var errorObject;
        var result;
        var actualErrorLine;
        var message;

        result = executeJavaScriptModule(runCommand, {
          moduleId: moduleId,
          functionId: functionId,
          preamble: header,
          epilogue: footer,
          originalCode: code,
          url: path
        });    

        // if a global error object was created
        if (result && result.error) {
          Inject.clearCache();
          throw result.error;
        }

        // cache the result (IF NOT AMD)
        if (!DEFINE_EXTRACTION_REGEX.test(code)) {
          this.cache[moduleId] = result;
        }

        this.executed[moduleId] = true;
        debugLog("Executor", "executed", moduleId, path, result);

        // return the result
        return result;
      }
    };
  });
  Executor = new AsStatic();
})();