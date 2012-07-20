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
  var testScriptNode = createEvalScript(testScript);
  var oldError = context.onerror;

  // capture document head
  try { docHead = document.getElementsByTagName("head")[0]; }
  catch(e) { docHead = false; }

  function createEvalScript(code) {
    var scr = document.createElement("script");
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

  // build a test script and ensure it works
  context.onerror = function(err, where, line) {
    onErrorOffset = 3 - line;
    cleanupEvalScriptNode(testScriptNode);
    return true;
  };
  if (docHead) {
    docHead.appendChild(testScriptNode);
  }
  context.onerror = oldError;
  // test script completion

  function getLineNumberFromException(e) {
    var lines;
    var phrases;
    if (typeof(e.lineNumber) !== "undefined" && e.lineNumber !== null) {
      return e.lineNumber;
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
    var result;

    options = {
      moduleId: options.moduleId || null,
      functionId: options.functionId || null,
      preamble: options.preamble || "",
      originalCode: options.originalCode || code,
      url: options.url || null
    };

    // create a temp error handler for exactly this run of code
    var tempErrorHandler = function(err, where, line) {
      var actualErrorLine = onErrorOffset - options.preamble.split("\n").length + line;
      var linesOfCode = code.split("\n").length;
      var originalLinesOfCode = options.originalCode.split("\n").length;
      var message = "";

      if(line === linesOfCode) {
        actualErrorLine = originalLinesOfCode
      }

      message = "Parse error in " + options.moduleId + " (" + options.url + ") on line " + actualErrorLine + ":\n  " + err;
      
      errorObject = new Error(message);
      return true
    };

    // set global onError handler
    context.onerror = tempErrorHandler;

    // insert script - catches parse errors
    var scr = createEvalScript(code);
    if (scr && docHead) {
      docHead.appendChild(scr);
      cleanupEvalScriptNode(scr);
    }

    // if there were no errors, tempErrorHandler never ran and
    // errorObject was never set. We can now evaluate using either the eval()
    // method or just running the function we built.
    if (!errorObject) {
      // no parse errors
      if (!docHead || userConfig.debug.sourceMap) {
        var sourceString = IS_IE ? "" : "//@ sourceURL=" + options.url;
        // toExec explicitly hits the window object
        var toExec = ["(", window.Inject.INTERNAL.execute[options.functionId].toString(), ")()"].join("");
        toExec = [toExec, sourceString].join("\n");
        result = eval(toExec);
      }
      else {
        result = context.Inject.INTERNAL.execute[options.functionId]();
      }
    }

    // restore the error handler
    context.onerror = oldError;

    // clean up the function we globally created if it exists
    if(context.Inject.INTERNAL.execute[options.functionId]) {
      delete context.Inject.INTERNAL.execute[options.functionId];
    }

    // if we have an error, throw it
    if (errorObject) {
      throw errorObject;
    }

    // return the results of the eval
    return result;
  }

  var AsStatic = Class.extend(function() {
    var functionCount = 0;
    return {
      init: function() {
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
              throw new Error("cannot setExports when exports have already been set");
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
        try {
          result = executeJavaScriptModule(runCommand, {
            moduleId: moduleId,
            functionId: functionId,
            preamble: header,
            originalCode: code,
            url: path
          });
        }
        catch(e) {
          errorObject = e;
        }       

        // if there was a result, but there was an error
        if(result && result.error) {
          actualErrorLine = onErrorOffset - header.split("\n").length + getLineNumberFromException(result.error);
          message = "Parse error in " + moduleId + " (" + path + ") on line " + actualErrorLine + ":\n  " + result.error.message;
          errorObject = new Error(message)
        }

        // if a global error object was created
        if (errorObject) {
          Inject.clearCache();
          throw errorObject;
        }

        // cache the result
        this.cache[moduleId] = result;
        this.executed[moduleId] = true;

        debugLog("Executor", "executed", moduleId, path, result);

        // return the result
        return result;
      }
    };
  });
  Executor = new AsStatic();
})();