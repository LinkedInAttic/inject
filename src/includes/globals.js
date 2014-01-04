/*jshint unused:false */
/*global window:true, XMLHttpRequest:true, ActiveXObject:true, console:true */
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
    User configuration options
    @property {string} moduleRoot Base path for all module includes
      @see InjectCore.setModuleRoot
    @property {number} fileExpires Time (in seconds) for how long to preserve
      items in cache @see InjectCore.setExpires
    @property {boolean} useSuffix Specify true to append file suffix when
      resolving an identifier to a URL.  @see RulesEngine.resolveFile
    @property {object} xd Contains properties related to cross-domain requests
    @property {string|null} xd.relayFile URL to easyXDM provider document
    @property {object} debug
    @property {boolean} debug.sourceMap Specify true to enable source
      mapping @see Executor
    @property {boolean} debug.logging Specify true to enable logging
      @see debugLog
    @type {object}
    @global
 */
var userConfig = {
  moduleRoot: null,
  fileExpires: 0,
  useSuffix: true,
  xd: {
    relayFile: null
  },
  debug: {
    sourceMap: false,
    logging: false
  }
};

/**
    The local scope
    @global
 */
var context = this;

/**
    Mappings for module => handling defined by the user.
    @global
  */
var userModules = {};

/**
    Returns whether or not 'property' exists in 'object' as a Function
    or Object.
    @param {object} object The object to inspect.
    @param {*} property The property to assert exists in 'object'
    @return {Boolean} true if 'property' exists in 'object', and false
      otherwise.
    @function
    @global
 */
var isHostMethod = function (object, property) {
  // Return if typeof is 'function', 'object' or 'unknown' (can occur for IE)
  // See http://stackoverflow.com/questions/10982739/typeof-returning-unknown-in-ie
  var t = typeof object[property];
  return t === 'function' || (!!(t === 'object' && object[property])) || t === 'unknown';
};

/**
    Calls the specified function in the specified scope.
    @param {Function} fn The function to call.
    @param {object} scope The scope to execute the function in.
    @return {*} The result of calling fn.
    @function
    @global
 */
function proxy(fn, scope) {
  if (!scope) {
    throw new Error('proxying requires a scope');
  }
  if (!fn) {
    throw new Error('proxying requires a function');
  }
  return function () {
    return fn.apply(scope, arguments);
  };
}

/**
    Apples fn to each item in given collection.
    @param {*[]} collection An array of arbitrary elements.
    @param {Function} fn A function that takes one argument.
      Each element from 'collection' will be passed to 'fn'.
    @function
    @global
 */
function each(collection, fn) {
  for (var i = 0, len = collection.length; i < len; i++) {
    fn(collection[i]);
  }
}

function guid() {
  return ('INJECT_xxxxxxxx_xxxx_4xxx_yxxx_xxxxxxxxxxxx').replace(/[xy]/g, function(c) {
    var r = Math.random() * 16|0, v = c == 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });
}

/**
    Function for logging debug output.
    @type {Function}
    @global
 */
var debugLog = function () {};
// TODO: more robust logging solution
(function () {
  var logs = [];
  var canLog = (typeof(console) !== 'undefined' && console.log  && typeof(console.log) === 'function');
  var doLog = function (origin, message) {
    if (userConfig.debug && userConfig.debug.logging) {
      console.log('## ' + origin + ' ##' + '\n' + message);
    }
  };
  if (canLog) {
    debugLog = doLog;
  }
})();

var normalizeStack;
(function() {
  var type = null;
  normalizeStack = function(stack) {
    if (!type) {
      type = stacknorm.mode(stack);
    }
    return stacknorm[type](stack);
  };
  
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
        // phantomJS looks like chrome, but only returns line numbers
        // We can look for [\d]+:[\d]+)?\n|$
        // Chrome 27 does not have e.arguments as earlier versions,
        // but still does not have e.fileName as Firefox
        var hasColumns = /:[\d]+:[\d]+\)?(\n|$)/;
        return (hasColumns.test(e.stack)) ? 'chrome' : 'phantom';
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
     * Given an Error object, return a formatted Array based on PhantomJS's stack string.
     *
     * @param e - Error object to inspect
     * @return Array<String> of function calls, files and line numbers
     */
    phantom: function(e) {
      return (e.stack + '\n')
        .replace(/^\s+(at eval )?at\s+/gm, '') // remove 'at' and indentation
        .replace(/^([^\(]+?)([\n$])/gm, '{anonymous}() ($1)$2')
        .replace(/^Object.<anonymous>\s*\(([^\)]+)\)/gm, '{anonymous}() ($1)')
        .replace(/^(.+) \((.+)\)$/gm, '$1@$2')
        .replace(/(.+):([0-9]+)(\)?)/g, '$1:$2:0$3')
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
}());

/**
    Methods to add and remove events based on browser capabilities.
    @param {Object} obj A target object to add or remove a listener.
    @param {String} evt The event type.
    @param {Function} fn The target function to add or remove.
    @param {Boolean} capture Use capturing if supported.
    @function
    @global
 */
var addListener, removeListener;
(function(win) {
  if (win.addEventListener) {
    addListener = function(el, evt, fn, capture) {
      el.addEventListener(evt, fn, capture || false);
    };
    removeListener = function(el, evt, fn, capture) {
      el.removeEventListener(evt, fn, capture || false);
    };
  }
  else {
    addListener = function(el, evt, fn) {
      el.attachEvent('on' + evt, fn);
    };
    removeListener = function(el, evt, fn) {
      el.detachEvent('on' + evt, fn);
    };
  }
}(window));