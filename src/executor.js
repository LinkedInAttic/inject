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
var Executor;
(function() {
  
  //Cache to store errors thrown by failed modules(indexed by moduleId)
  //getModule uses this to return the right error when asked for a broken module
  var moduleFailureCache = {};

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

  // stack normalizer from https://github.com/eriwen/javascript-stacktrace/blob/master/stacktrace.js
  var stacknorm = {
    /**
     * Mode could differ for different exception, e.g.
     * exceptions in Chrome may or may not have arguments or stack.
     *
     * @return {String} mode of operation for the exception
     */
    mode: function(e) {
        if (e['arguments'] && e.stack) {
            return 'chrome';
        } else if (e.stack && e.sourceURL) {
            return 'safari';
        } else if (e.stack && e.number) {
            return 'ie';
        } else if (e.stack && e.fileName) {
            return 'firefox';
        } else if (e.message && e['opera#sourceloc']) {
            // e.message.indexOf("Backtrace:") > -1 -> opera9
            // 'opera#sourceloc' in e -> opera9, opera10a
            // !e.stacktrace -> opera9
            if (!e.stacktrace) {
                return 'opera9'; // use e.message
            }
            if (e.message.indexOf('\n') > -1 && e.message.split('\n').length > e.stacktrace.split('\n').length) {
                // e.message may have more stack entries than e.stacktrace
                return 'opera9'; // use e.message
            }
            return 'opera10a'; // use e.stacktrace
        } else if (e.message && e.stack && e.stacktrace) {
            // e.stacktrace && e.stack -> opera10b
            if (e.stacktrace.indexOf("called from line") < 0) {
                return 'opera10b'; // use e.stacktrace, format differs from 'opera10a'
            }
            // e.stacktrace && e.stack -> opera11
            return 'opera11'; // use e.stacktrace, format differs from 'opera10a', 'opera10b'
        } else if (e.stack && !e.fileName) {
            // Chrome 27 does not have e.arguments as earlier versions,
            // but still does not have e.fileName as Firefox
            return 'chrome';
        }
        return 'other';
    },
  
    /**
     * Given an Error object, return a formatted Array based on Chrome's stack string.
     *
     * @param e - Error object to inspect
     * @return Array<String> of function calls, files and line numbers
     */
    chrome: function(e) {
      return (e.stack + '\n')
        .replace(/^\s+(at eval )?at\s+/gm, '') // remove 'at' and indentation
        .replace(/^([^\(]+?)([\n$])/gm, '{anonymous}() ($1)$2')
        .replace(/^Object.<anonymous>\s*\(([^\)]+)\)/gm, '{anonymous}() ($1)')
        .replace(/^(.+) \((.+)\)$/gm, '$1@$2')
        .split('\n')
        .slice(1, -1);
    },

    /**
     * Given an Error object, return a formatted Array based on Safari's stack string.
     *
     * @param e - Error object to inspect
     * @return Array<String> of function calls, files and line numbers
     */
    safari: function(e) {
      return e.stack.replace(/\[native code\]\n/m, '')
        .replace(/^(?=\w+Error\:).*$\n/m, '')
        .replace(/^@/gm, '{anonymous}()@')
        .split('\n');
    },

    /**
     * Given an Error object, return a formatted Array based on IE's stack string.
     *
     * @param e - Error object to inspect
     * @return Array<String> of function calls, files and line numbers
     */
    ie: function(e) {
      return e.stack
        .replace(/^\s*at\s+(.*)$/gm, '$1')
        .replace(/^Anonymous function\s+/gm, '{anonymous}() ')
        .replace(/^(.+)\s+\((.+)\)$/gm, '$1@$2')
        .split('\n')
        .slice(1);
    },

    /**
     * Given an Error object, return a formatted Array based on Firefox's stack string.
     *
     * @param e - Error object to inspect
     * @return Array<String> of function calls, files and line numbers
     */
    firefox: function(e) {
      return e.stack.replace(/(?:\n@:0)?\s+$/m, '')
        .replace(/^(?:\((\S*)\))?@/gm, '{anonymous}($1)@')
        .split('\n');
    },

    opera11: function(e) {
      var ANON = '{anonymous}', lineRE = /^.*line (\d+), column (\d+)(?: in (.+))? in (\S+):$/;
      var lines = e.stacktrace.split('\n'), result = [];

      for (var i = 0, len = lines.length; i < len; i += 2) {
        var match = lineRE.exec(lines[i]);
        if (match) {
          var location = match[4] + ':' + match[1] + ':' + match[2];
          var fnName = match[3] || "global code";
          fnName = fnName.replace(/<anonymous function: (\S+)>/, "$1").replace(/<anonymous function>/, ANON);
          result.push(fnName + '@' + location + ' -- ' + lines[i + 1].replace(/^\s+/, ''));
        }
      }

      return result;
    },

    opera10b: function(e) {
      // "<anonymous function: run>([arguments not available])@file://localhost/G:/js/stacktrace.js:27\n" +
      // "printStackTrace([arguments not available])@file://localhost/G:/js/stacktrace.js:18\n" +
      // "@file://localhost/G:/js/test/functional/testcase1.html:15"
      var lineRE = /^(.*)@(.+):(\d+)$/;
      var lines = e.stacktrace.split('\n'), result = [];

      for (var i = 0, len = lines.length; i < len; i++) {
        var match = lineRE.exec(lines[i]);
        if (match) {
          var fnName = match[1] ? (match[1] + '()') : "global code";
          result.push(fnName + '@' + match[2] + ':' + match[3]);
        }
      }

      return result;
    },

    /**
     * Given an Error object, return a formatted Array based on Opera 10's stacktrace string.
     *
     * @param e - Error object to inspect
     * @return Array<String> of function calls, files and line numbers
     */
    opera10a: function(e) {
      // "  Line 27 of linked script file://localhost/G:/js/stacktrace.js\n"
      // "  Line 11 of inline#1 script in file://localhost/G:/js/test/functional/testcase1.html: In function foo\n"
      var ANON = '{anonymous}', lineRE = /Line (\d+).*script (?:in )?(\S+)(?:: In function (\S+))?$/i;
      var lines = e.stacktrace.split('\n'), result = [];

      for (var i = 0, len = lines.length; i < len; i += 2) {
        var match = lineRE.exec(lines[i]);
        if (match) {
          var fnName = match[3] || ANON;
          result.push(fnName + '()@' + match[2] + ':' + match[1] + ' -- ' + lines[i + 1].replace(/^\s+/, ''));
        }
      }

      return result;
    },

    // Opera 7.x-9.2x only!
    opera9: function(e) {
      // "  Line 43 of linked script file://localhost/G:/js/stacktrace.js\n"
      // "  Line 7 of inline#1 script in file://localhost/G:/js/test/functional/testcase1.html\n"
      var ANON = '{anonymous}', lineRE = /Line (\d+).*script (?:in )?(\S+)/i;
      var lines = e.message.split('\n'), result = [];

      for (var i = 2, len = lines.length; i < len; i += 2) {
        var match = lineRE.exec(lines[i]);
        if (match) {
          result.push(ANON + '()@' + match[2] + ':' + match[1] + ' -- ' + lines[i + 1].replace(/^\s+/, ''));
        }
      }

      return result;
    },

    // Safari 5-, IE 9-, and others
    other: function(curr) {
      var ANON = '{anonymous}', fnRE = /function\s*([\w\-$]+)?\s*\(/i, stack = [], fn, args, maxStackSize = 10;
      while (curr && curr['arguments'] && stack.length < maxStackSize) {
        fn = fnRE.test(curr.toString()) ? RegExp.$1 || ANON : ANON;
        args = Array.prototype.slice.call(curr['arguments'] || []);
        stack[stack.length] = fn + '(' + this.stringifyArguments(args) + ')';
        curr = curr.caller;
      }
      return stack;
    }
  };

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
  function executeJavaScriptModule(code, functionId) {
    var meta = context.Inject.INTERNAL.executor[functionId];
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
    // if there is not a registered function in the INTERNAL namespace, there
    // must have been a syntax error. Firefox mandates an eval to expose it, so
    // we use that as the least common denominator
    if (userConfig.debug.sourceMap) {
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
      // __EXCEPTION__.lineNumber - Inject.INTERNAL.modules.exec2.__error_line.lineNumber - 1
      context.Inject.INTERNAL.executor[functionId].fn();

      if (module.__error) {
        module.__error.message = 'Runtime error in ' + module.id + '(' + module.uri + ') ' + module.__error.message;
      }
    }

    // // clean up the function or object we globally created if it exists
    // if (context.Inject.INTERNAL.execute[functionId]) {
    //   delete context.Inject.INTERNAL.execute[functionId];
    // }
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
      
      setModule: function(id, module) {
        if (id === null || ''+id === '') {
          return;
        }
        this.cache[id] = module;
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
        var alias = RulesEngine.getOriginalName(idAlias);
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
        
        if (this.errors[idAlias]) {
          err = this.errors[idAlias];
        }
        else if (alias && this.errors[alias]) {
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
            stackMode = stacknorm.mode(err);
            mainTrace = stacknorm[stackMode](err);
            offsetTrace = stacknorm[stackMode](module.__error_line);
            mainTracePieces = mainTrace[0].split(/:/);
            offsetTracePieces = offsetTrace[0].split(/:/);
            
            actualLine =  mainTracePieces[mainTracePieces.length - 2] - offsetTracePieces[offsetTracePieces.length - 2];
            actualLine = actualLine - 1;
            
            actualChar = mainTracePieces[mainTracePieces.length - 1];
            
            errorMessage = errorMessage + '@ Line: ' + actualLine + ' Column: ' + actualChar + ' ';
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
      createModule : function(moduleId, path) {
        var module;

        if (!this.getFromCache(moduleId)) {
          module = {};
          module.id = moduleId || null;
          module.uri = path || null;
          module.exports = {};
          module.error = null;
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
        var localMeta = {};
        context.Inject.INTERNAL.executor[functionId] = localMeta;
        
        localMeta.module = module;
        localMeta.require = RequireContext.createRequire(module.id, module.uri);
        localMeta.define = RequireContext.createInlineDefine(module, localMeta.require);

        function swapUnderscoreVars(text) {
          return text.replace(/__MODULE_ID__/g, module.id)
            .replace(/__MODULE_URI__/g, module.uri)
            .replace(/__FUNCTION_ID__/g, functionId)
            .replace(/__INJECT_NS__/g, NAMESPACE);
        }

        var header = swapUnderscoreVars(commonJSHeader);
        var footer = swapUnderscoreVars(commonJSFooter);
        var runCommand = ([header, ';', code, footer]).join('\n');

        executeJavaScriptModule(runCommand, functionId);

        // if a global error object was created
        if (module.__error) {
          // context[NAMESPACE].clearCache();
          // exit early, this module is broken
          debugLog('Executor', 'broken', module.id, module.uri, module.exports);
          this.errors[module.id] = module.__error;
        }

        debugLog('Executor', 'executed', module.id, module.uri, module.exports);
      }
    };
  });
  Executor = new AsStatic();
})();
