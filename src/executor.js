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

var Executor;
(function() {
  var docHead = false;
  var onErrorOffset = 0;
  var testScript = 'function Inject_Test_Known_Error() {\n  function nil() {}\n  nil("Known Syntax Error Line 3";\n}';
  var initOldError = context.onerror;
  var testScriptNode = createEvalScript(testScript);

  // capture document head
  try { docHead = document.getElementsByTagName("head")[0]; }
  catch(e) { docHead = false; }

  function createEvalScript(code) {
    var scr = document.createElement("script");
    scr.type = "text/javascript";
    try { scr.text = code; } catch (e) {
    try { scr.innerHTML = code; } catch (ee) {
      return false;
    }}
    return scr;
  }

  function cleanupEvalScriptNode(node) {
    window.setTimeout(function() {
      if (docHead) {
        return docHead.removeChild(node);
      }
    });
  }

  function defineEvalScriptNode(node, url) {
    node.src = url;
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

  function executeJavaScriptModule(code, options) {
    var oldError = context.onerror;
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

    // create a temp error handler for exactly this run of code
    // we use this for syntax error handling. It's an inner function
    // because we need to set the universal "errorObject" object
    // so we don't try and execute it later
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

      context.onerror = oldError;

      return true;
    };

    // set global onError handler
    // insert script - catches parse errors
    context.onerror = tempErrorHandler;
    var scr = createEvalScript(code);
    if (scr && docHead) {
      docHead.appendChild(scr);
      defineEvalScriptNode(scr, options.url);
      // cleanupEvalScriptNode(scr);
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
            try { eval("+\n//@ sourceURL=inject-executor-line.js"); } catch (ee) { relativeE = ee; }
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
          try { eval("+\n//@ sourceURL=inject-executor-line.js"); } catch (ee) { relativeE = ee; }
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
      init: function() {
        this.clearCaches();
      },
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
      defineExecutingModuleAs: function(moduleId, path) {
        return this.anonymousAMDStack.push({
          id: moduleId,
          path: path
        });
      },
      undefineExecutingModule: function() {
        return this.anonymousAMDStack.pop();
      },
      getCurrentExecutingAMD: function() {
        return this.anonymousAMDStack[this.anonymousAMDStack.length - 1];
      },
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
      isModuleDefined: function(moduleId) {
        return this.defined[moduleId];
      },
      flagModuleAsDefined: function(moduleId) {
        this.defined[moduleId] = true;
      },
      flagModuleAsBroken: function(moduleId) {
        this.broken[moduleId] = true;
      },
      flagModuleAsCircular: function(moduleId) {
        this.circular[moduleId] = true;
      },
      isModuleCircular: function(moduleId) {
        return this.circular[moduleId];
      },
      getModule: function(moduleId) {
        if (this.broken[moduleId]) {
          throw new Error("module "+moduleId+" failed to load successfully");
        }
        return this.cache[moduleId] || null;
      },
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

        // try to run the JS as a module, errors set errorObject
        // try {
          result = executeJavaScriptModule(runCommand, {
            moduleId: moduleId,
            functionId: functionId,
            preamble: header,
            epilogue: footer,
            originalCode: code,
            url: path
          });
        // }
        // catch(e) {
        //   errorObject = e;
        // }       

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