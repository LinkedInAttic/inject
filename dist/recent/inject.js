/*
Inject
Copyright 2013 LinkedIn

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
(function(context, undefined) {
  // --------------------------------------------------
  // ENVIRONMENT
  // --------------------------------------------------
  var InjectContext;
  function init(version) {
    var ic = InjectContext.createContext();
    context.require = ic.require;
    context.define = ic.define;
    context.Inject = ic.Inject;
    context.Inject.version = version;
  }
  
  // --------------------------------------------------
  // INCLUDES/
  // --------------------------------------------------
  /*jshint unused:false */
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
 * Below are the "sandboxing" wrappers for our commonJS implementation
 * we reach in to the inject namespace (default "Inject"), into the
 * _ object, which contains methods reachable during the eval.
 * Markers in the file for dynamic content are identified with
 * __DOUBLE_UNDERSCORES__
 * @file This file contains the commonJS header and footers
**/

/**
    CommonJS header with placeholders for Inject namespace, module ID,
    module URI, function ID and pointcut before advice.
    @type {string}
    @global
*/
var commonJSHeader = (['',
  '__REACHABLE_PATH__.fn = function() {',
  '  with (window) {',
  '    __REACHABLE_PATH__.innerFn = function() {',
  '      // id: __MODULE_ID__ uri: __MODULE_URI__',
  '      var module = __REACHABLE_PATH__.module,',
  '          require = __REACHABLE_PATH__.require,',
  '          define = __REACHABLE_PATH__.define,',
  '          exports = module.exports;',  
  '      try{module.undefined_function();}catch(e){module.__error_line = e;}' // NOTE: Must be on one line for clean error reporting
  ]).join('\n');

/**
    CommonJS footer with placeholders for Inject namespace, exception, and
    pointcut after advice.
    @type {string}
    @global
*/
var commonJSFooter = (['',
  '      __REACHABLE_PATH__.module = module;',
  '    };',
  '    __REACHABLE_PATH__.defineExecutingModuleAs("__MODULE_ID__", "__MODULE_URI__");',
  '    try {',
  '      __REACHABLE_PATH__.innerFn.call(__REACHABLE_PATH__.module);',
  '    }',
  '    catch (__EXCEPTION__) {',
  '      __REACHABLE_PATH__.module.__error = __EXCEPTION__;',
  '    }',
  '    __REACHABLE_PATH__.undefineExecutingModule();',
  '  }',
  '};',
  '']).join('\n');

  /*jshint unused:false, evil:true */
/*global navigator:true, Object:true, localStorage:true */
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

// sniffs and assigns UA tests
var IS_IE = eval('/*@cc_on!@*/false');
var IS_GK = false;
(function () {
  var ua = navigator.userAgent.toLowerCase();
  if (ua.indexOf('gecko') !== -1) {
    IS_GK = true;
  }
})();

/**
 * a storagetoken identifier we use for the bucket (lscache)
 * @constant
 */
var FILE_STORAGE_TOKEN = 'INJECT';

/**
 * the version of data storage schema for lscache
 * @constant
 */
var LSCACHE_SCHEMA_VERSION = 1;

/**
 * the schema version string for validation of lscache schema
 * @constant
 */
var LSCACHE_SCHEMA_VERSION_STRING = '!version';

/**
 * the cache version string for validation of developer lscache code
 * @constant
 */
var LSCACHE_APP_KEY_STRING = '!appCacheKey';

/**
 * Regex for identifying things that end in *.js or *.txt
 * @constant
 */
var FILE_SUFFIX_REGEX = /.*?\.(js|txt)(\?.*)?$/;

/**
 * This is the basic suffix for JS files. When there is no
 * extension, we add this if enabled
 * @constant
 */
var BASIC_FILE_SUFFIX = '.js';

/** prefixes for URLs that begin with http/https
 * @constant
 */
var HOST_PREFIX_REGEX = /^https?:\/\//;

/**
 * suffix for URLs used to capture everything up to / or the
 * end of the string
 * @constant
 */
var HOST_SUFFIX_REGEX = /^(.*?)(\/.*|$)/;

/**
 * a regular expression for slicing a response from iframe communication into its parts
 * (1) Anything up to a space (status code)
 * (2) Anything up to a space (moduleid)
 * (3) Any text up until the end of the string (file)
 * @constant
 **/
var RESPONSE_SLICER_REGEX = /^(.+?)[\s]+([\w\W]+?)[\s]+([\w\W]+)$/m;

/**
 * a regex to locate the function () opener
 * @constant
 */
var FUNCTION_REGEX = /^[\s\(]*function[^\(]*\(([^)]*)\)/;

/**
 * a regex to locate newlines within a function body
 * @constant
 */
var FUNCTION_NEWLINES_REGEX = /\/\/.*?[\r\n]|\/\*(?:.|[\r\n])*?\*\//g;

/**
 * captures the body of a JS function
 * @constant
 */
var FUNCTION_BODY_REGEX = /[\w\W]*?\{([\w\W]*)\}/m;

/**
 * locate whitespace within a function body
 * @constant
 */
var WHITESPACE_REGEX = /\s+/g;

/**
 * Extract require() statements from within a larger string.
 * Used by analyzer to parse files.
 * @constant
 */
var REQUIRE_REGEX = new RegExp(
  '(?:^|[\\s;,=\\?:\\}\\)\\(])' + // begins with start of string, and any symbol a function call() can follow
  'require[\\s]*\\('+             // the keyword "require", whitespace, and then an opening paren
  '[\'"]'+                        // a quoted stirng (require takes a single or double quoted string)
  '([^\'"]+?)'+                   // the valid characters for a "module identifier"... includes AMD characters. You cannot match a quote
  '[\'"]' +                       // the closing quote character
  '\\)',                          // end of paren for "require"
  'gim'                           // flags: global, case-insensitive, multiline
);

/**
 * Extract define() statements from within a larger string.
 * Used by analyzer to parse files.
 * @constant
 */
var DEFINE_REGEX = new RegExp(
  '(?:^|[\\s;,\\?\\}\\)\\(])' +   // begins with start of string, and any symbol a function call() can follow
  'define[\\s]*\\(' +             // the "define" keyword, followed by optional whitespace and its opening paren
  '[\\w\\W]*?\\[' +               // anything (don't care) until we hit the first [
  '([\\w\\W]*?)' +                // our match (contents of the array)
  '\\]',                          // the closing bracket
  'gim'                           // flags: global, case-insensitive, multiline
);

/**
 * Extract terms from define statements.
 * Used by analyzer to parse files in conjunction with DEFINE_REGEX.
 * @constant
 */
var DEFINE_TERM_REGEX = new RegExp(
  '[\'"]' +                       // a quote
  '([\\w\\W]*?)' +                // the term inside of quotes
  '[\'"]',                        // the closing quotes
  'gim'                           // flags: global, case-insensitive, multiline
);

/**
 * extract define() statements from within a larger string
 * note: this was changed to resolve #177, we used the
 * don't-be-greedy modifiers on the \S and \w\W sections
 * @constant
 */
var IS_AMD_REGEX = /(?:^|[\s]+)define[\s]*\(/g;

/**
 * index of all commonJS builtins in a function arg collection
 * @constant
 */
var BUILTINS = {require: true, exports: true, module: true};

/**
 * a regex for replacing builtins and quotes
 * @constant
 */
var BUILTINS_REPLACE_REGEX = /[\s]|"|'|(require)|(exports)|(module)/g;

/**
 * capture anything that involves require*, aggressive to cut
 * down the number of lines we analyze
 * @constant
 */
var GREEDY_REQUIRE_REXEX = /require.*/;

/**
 * match comments in our file (so we can strip during a static analysis)
 * @constant
 */
var JS_COMMENTS_REGEX = /(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/mg;

/**
 * identifies a path as relative
 * @constant
 */
var RELATIVE_PATH_REGEX = /^(\.{1,2}\/).+/;

/**
 * identifies a path as absolute fully-qualified URL
 * @constant
 */
var ABSOLUTE_PATH_REGEX = /^([A-Za-z]+:)?\/\//;

/**
 * The :// part of the protocol (to remove when splitting on / for URLs)
 * @constant
 */
var PROTOCOL_REGEX = /:\/\//;

/**
 * A string equivalent of the protocol regex
 * @constant
 */
var PROTOCOL_STRING = '://';

/**
 * A replacement for :// that doesn't contain slashes
 * @constant
 */
var PROTOCOL_EXPANDED_REGEX = /__INJECT_PROTOCOL_COLON_SLASH_SLASH__/;

/**
 * A string version of the expanded protocol regex
 * @constant
 */
var PROTOCOL_EXPANDED_STRING = '__INJECT_PROTOCOL_COLON_SLASH_SLASH__';

/**
 * the default hasOwnProperty method
 */
var HAS_OWN_PROPERTY = Object.prototype.hasOwnProperty;

/**
 * run a test to determine if localstorage is available
 * @constant
 */
var HAS_LOCAL_STORAGE = (function () {
  try {
    localStorage.setItem('injectLStest', 'ok');
    localStorage.removeItem('injectLStest');
    return true;
  }
  catch (err) {
    return false;
  }
})();

/**
 * this regex is used to strip leading slashes
 * @constant
 */
var LEADING_SLASHES_REGEX = /^\/+/g;

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

  // --------------------------------------------------  
  // XD COLLECTION
  // --------------------------------------------------
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

var reURI = /^((http.?:)\/\/([^:\/\s]+)(:\d+)*)/; // returns groups for protocol (2), domain (3) and port (4) 

function addListener(el, evt, fn) {
  if (window.addEventListener) {
    el.addEventListener(evt, fn, false);
  }
  else {
    el.attachEvent('on' + evt, fn);
  }
}

function getDomainName(url) {
  return url.match(reURI)[3];
}

function sendMessage(target, targetsUrl, command, params) {
  if (!params) {
    params = {};
  }
  
  params = JSON.stringify(params);
  target.postMessage([command, params].join(':'), targetsUrl);
}

var getXHR = (function() {
  var XMLHttpFactories = [
    function () { return new XMLHttpRequest(); },
    function () { return new ActiveXObject("Msxml2.XMLHTTP"); },
    function () { return new ActiveXObject("Msxml3.XMLHTTP"); },
    function () { return new ActiveXObject("Microsoft.XMLHTTP"); }
  ];

  var xmlhttp = false;
  for (var i=0;i<XMLHttpFactories.length;i++) {
    try {
      XMLHttpFactories[i]();
      xmlhttp = XMLHttpFactories[i];
    }
    catch (e) {
      continue;
    }
    break;
  }

  return xmlhttp;
}());

  // --------------------------------------------------
  // FIBER
  // --------------------------------------------------
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
var module = {
  exports: {}
};
  //     Fiber.js 1.0.4
//     @Author: Kirollos Risk
//
//     Copyright (c) 2012 LinkedIn.
//     All Rights Reserved. Apache Software License 2.0
//     http://www.apache.org/licenses/LICENSE-2.0

( function( global ) {

  // Baseline setup
  // --------------

  // Stores whether the object is being initialized. i.e., whether
  // to run the `init` function, or not.
  var initializing = false,

  // Keep a few prototype references around - for speed access,
  // and saving bytes in the minified version.
    ArrayProto = Array.prototype,

  // Save the previous value of `Fiber`.
    previousFiber = global.Fiber;

  // Helper function to copy properties from one object to the other.
  function copy( from, to ) {
    var name;
    for( name in from ) {
      if( from.hasOwnProperty( name ) ) {
        to[name] = from[name];
      }
    }
  }

  // The base `Fiber` implementation.
  function Fiber(){};

  // ###Extend
  //
  // Returns a subclass.
  Fiber.extend = function( fn ) {
    // Keep a reference to the current prototye.
    var parent = this.prototype,

    // Invoke the function which will return an object literal used to define
    // the prototype. Additionally, pass in the parent prototype, which will
    // allow instances to use it.
      properties = fn( parent ),

    // Stores the constructor's prototype.
      proto;

    // The constructor function for a subclass.
    function child(){
      if( !initializing ){
        // Custom initialization is done in the `init` method.
        this.init.apply( this, arguments );
        // Prevent susbsequent calls to `init`.
        // Note: although a `delete this.init` would remove the `init` function from the instance,
        // it would still exist in its super class' prototype.  Therefore, explicitly set
        // `init` to `void 0` to obtain the `undefined` primitive value (in case the global's `undefined`
        // property has been re-assigned).
        this.init = void 0;
      }
    }

    // Instantiate a base class (but only create the instance, without running `init`).
    // and make every `constructor` instance an instance of `this` and of `constructor`.
    initializing = true;
    proto = child.prototype = new this;
    initializing = false;

    // Add default `init` function, which a class may override; it should call the
    // super class' `init` function (if it exists);
    proto.init = function(){
      if ( typeof parent.init === 'function' ) {
        parent.init.apply( this, arguments );
      }
    };

     // Copy the properties over onto the new prototype.
    copy( properties, proto );

    // Enforce the constructor to be what we expect.
    proto.constructor = child;

    // Keep a reference to the parent prototype.
    // (Note: currently used by decorators and mixins, so that the parent can be inferred).
    child.__base__ = parent;

     // Make this class extendable.
    child.extend = Fiber.extend;

    return child;
  };

  // Utilities
  // ---------

  // ###Proxy
  //
  // Returns a proxy object for accessing base methods with a given context.
  //
  // - `base`: the instance' parent class prototype.
  // - `instance`: a Fiber class instance.
  //
  // Overloads:
  //
  // - `Fiber.proxy( instance )`
  // - `Fiber.proxy( base, instance )`
  //
  Fiber.proxy = function( base, instance ) {
    var name,
      iface = {},
      wrap;

    // If there's only 1 argument specified, then it is the instance,
    // thus infer `base` from its constructor.
    if ( arguments.length === 1 ) {
      instance = base;
      base = instance.constructor.__base__;
    }

    // Returns a function which calls another function with `instance` as
    // the context.
    wrap = function( fn ) {
      return function() {
        return base[fn].apply( instance, arguments );
      };
    };

    // For each function in `base`, create a wrapped version.
    for( name in base ){
      if( base.hasOwnProperty( name ) && typeof base[name] === 'function' ){
        iface[name] = wrap( name );
      }
    }
    return iface;
  };

  // ###Decorate
  //
  // Decorate an instance with given decorator(s).
  //
  // - `instance`: a Fiber class instance.
  // - `decorator[s]`: the argument list of decorator functions.
  //
  // Note: when a decorator is executed, the argument passed in is the super class' prototype,
  // and the context (i.e. the `this` binding) is the instance.
  //
  //  *Example usage:*
  //
  //     function Decorator( base ) {
  //       // this === obj
  //       return {
  //         greet: function() {
  //           console.log('hi!');
  //         }
  //       };
  //     }
  //
  //     var obj = new Bar(); // Some instance of a Fiber class
  //     Fiber.decorate(obj, Decorator);
  //     obj.greet(); // hi!
  //
  Fiber.decorate = function( instance /*, decorator[s] */) {
    var i,
      // Get the base prototype.
      base = instance.constructor.__base__,
      // Get all the decorators in the arguments.
      decorators = ArrayProto.slice.call( arguments, 1 ),
      len = decorators.length;

    for( i = 0; i < len; i++ ){
      copy( decorators[i].call( instance, base ), instance );
    }
  };

  // ###Mixin
  //
  // Add functionality to a Fiber definition
  //
  // - `definition`: a Fiber class definition.
  // - `mixin[s]`: the argument list of mixins.
  //
  // Note: when a mixing is executed, the argument passed in is the super class' prototype
  // (i.e., the base)
  //
  // Overloads:
  //
  // - `Fiber.mixin( definition, mix_1 )`
  // - `Fiber.mixin( definition, mix_1, ..., mix_n )`
  //
  // *Example usage:*
  //
  //     var Definition = Fiber.extend(function(base) {
  //       return {
  //         method1: function(){}
  //       }
  //     });
  //
  //     function Mixin(base) {
  //       return {
  //         method2: function(){}
  //       }
  //     }
  //
  //     Fiber.mixin(Definition, Mixin);
  //     var obj = new Definition();
  //     obj.method2();
  //
  Fiber.mixin = function( definition /*, mixin[s] */ ) {
    var i,
      // Get the base prototype.
      base = definition.__base__,
      // Get all the mixins in the arguments.
      mixins = ArrayProto.slice.call( arguments, 1 ),
      len = mixins.length;

    for( i = 0; i < len; i++ ){
      copy( mixins[i]( base ), definition.prototype );
    }
  };

  // ###noConflict
  //
  // Run Fiber.js in *noConflict* mode, returning the `fiber` variable to its
  // previous owner. Returns a reference to the Fiber object.
  Fiber.noConflict = function() {
    global.Fiber = previousFiber;
    return Fiber;
  };

  // Common JS
  // --------------

  // Export `Fiber` to Common JS Loader
  if( typeof module !== 'undefined' ) {
    if( typeof module.setExports === 'function' ) {
      module.setExports( Fiber );
    } else if( module.exports ) {
      module.exports = Fiber;
    }
  } else {
    global.Fiber = Fiber;
  }

// Establish the root object: `window` in the browser, or global on the server.
})( this );

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

var Fiber = module.exports;
module = undefined;
  
  // --------------------------------------------------
  // FLOW
  // --------------------------------------------------
  /*
Go With the Flow
Copyright (c) 2011 Jerome Etienne, http://jetienne.com

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

var Flow  = function(){
  var self, stack = [], timerId = setTimeout(function(){ timerId = null; self._next(); }, 0);
  return self = {
    destroy : function(){ timerId && clearTimeout(timerId); },
    par : function(callback, isSeq){
      if(isSeq || !(stack[stack.length-1] instanceof Array)) stack.push([]);
      stack[stack.length-1].push(callback);
      return self;
    },seq : function(callback){ return self.par(callback, true);  },
    _next : function(err, result){
      var errors = [], results = [], callbacks = stack.shift() || [], nbReturn = callbacks.length, isSeq = nbReturn == 1;
      for(var i = 0; i < callbacks.length; i++){
        (function(fct, index){
          fct(function(error, result){
            errors[index] = error;
            results[index]  = result;   
            if(--nbReturn == 0) self._next(isSeq?errors[0]:errors, isSeq?results[0]:results)
          }, err, result)
        })(callbacks[i], i);
      }
    }
  }
};
  
  // --------------------------------------------------
  // LSCACHE
  // --------------------------------------------------
  /**
 * lscache library
 * Copyright (c) 2011, Pamela Fox
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/** @ignore */
var lscache=function(){function k(){if(void 0!==g)return g;try{l("__lscachetest__","__lscachetest__"),f("__lscachetest__"),g=!0}catch(a){g=!1}return g}function o(){void 0===j&&(j=null!=window.JSON);return j}function l(a,b){localStorage.removeItem(e+c+a);localStorage.setItem(e+c+a,b)}function f(a){localStorage.removeItem(e+c+a)}var e="lscache-",p=Math.floor(144E9),g,j,c="";return{set:function(a,b,h){if(k()){if("string"!==typeof b){if(!o())return;try{b=JSON.stringify(b)}catch(g){return}}try{l(a,b)}catch(j){if("QUOTA_EXCEEDED_ERR"===
j.name||"NS_ERROR_DOM_QUOTA_REACHED"===j.name){for(var m=[],d,i=0;i<localStorage.length;i++)if(d=localStorage.key(i),0===d.indexOf(e+c)&&0>d.indexOf("-cacheexpiration")){d=d.substr((e+c).length);var n=localStorage.getItem(e+c+(d+"-cacheexpiration")),n=n?parseInt(n,10):p;m.push({key:d,size:(localStorage.getItem(e+c+d)||"").length,expiration:n})}m.sort(function(a,b){return b.expiration-a.expiration});for(i=(b||"").length;m.length&&0<i;)d=m.pop(),f(d.key),f(d.key+"-cacheexpiration"),i-=d.size;try{l(a,
b)}catch(q){return}}else return}h?l(a+"-cacheexpiration",(Math.floor((new Date).getTime()/6E4)+h).toString(10)):f(a+"-cacheexpiration")}},get:function(a){if(!k())return null;var b=a+"-cacheexpiration",h=localStorage.getItem(e+c+b);if(h&&(h=parseInt(h,10),Math.floor((new Date).getTime()/6E4)>=h))return f(a),f(b),null;a=localStorage.getItem(e+c+a);if(!a||!o())return a;try{return JSON.parse(a)}catch(g){return a}},remove:function(a){if(!k())return null;f(a);f(a+"-cacheexpiration")},supported:function(){return k()},
flush:function(){if(k())for(var a=localStorage.length-1;0<=a;--a){var b=localStorage.key(a);0===b.indexOf(e+c)&&localStorage.removeItem(b)}},setBucket:function(a){c=a},resetBucket:function(){c=""}}}();
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

(function () {
  /*
  lscache configuration
  requires: localstorage, lscache
  Test the schema version inside of lscache, and if it has changed, flush the cache
  */
  var schemaVersion;
  if (HAS_LOCAL_STORAGE && lscache) {
    lscache.setBucket(FILE_STORAGE_TOKEN);
    schemaVersion = lscache.get(LSCACHE_SCHEMA_VERSION_STRING);

    if (schemaVersion && schemaVersion > 0 && schemaVersion < LSCACHE_SCHEMA_VERSION) {
      lscache.flush();
      lscache.set(LSCACHE_SCHEMA_VERSION_STRING, LSCACHE_SCHEMA_VERSION);
    }
  }
})();

  // --------------------------------------------------
  // INJECT FILES
  // --------------------------------------------------
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
 * The analyzer module handles extract the clean dependencies list
 * from a given file and supports remove buildin modules from a
 * given module list
 * @file
**/
var Analyzer = Fiber.extend(function() {

  return {
    /**
     * analyzer initialization
     * @constructs Analyzer
     */
    init: function() {},
    
    /**
     * Clean up moduleIds by removing all buildin modules
     * (requie, exports, module) from a given module list
     * @method Analyzer.stripBuiltins
     * @param {Array} modules - a dirty list of modules
     * @public
     * @returns {Array} a clean list of modules without buildins
     */

    stripBuiltins: function(modules) {

      var strippedModuleList = [],
          len = modules.length,
          i = 0;

      for (i; i < len; i++) {
        //modules[i] is the moduleId
        if (!BUILTINS[modules[i]]) {
          strippedModuleList.push(modules[i]);
        }
      }
      return strippedModuleList;
    },

    
    /**
     * Extract the clean dependency requires from a given file as
     * String, remove all buildin requires, merge requires from
     * AMD define purpose
     * @method Analyzer.extractRequires
     * @param {String} file - a string of a file
     * @public
     * @returns {Array} a clean list of dependency requires from a
     * module file
     */
    extractRequires: function(file) {
      /*jshint boss:true */

      var dependencies = [],
          dependencyCache = {
            require: 1,
            module: 1,
            exports: 1
          },
          item,
          term,
          dep;

      if (!file) {
        return [];
      }

      file = file.replace(JS_COMMENTS_REGEX, '');

      while (item = REQUIRE_REGEX.exec(file)) {
        dep = item[1];
        if (!dependencyCache[dep]) {
          dependencyCache[dep] = 1;
          dependencies.push(dep);
        }
      }
      
      while (item = DEFINE_REGEX.exec(file)) {
        while (term = DEFINE_TERM_REGEX.exec(item[1])) {
          dep = term[1];
          if (!dependencyCache[dep]) {
            dependencyCache[dep] = 1;
            dependencies.push(dep);
          }
        }
      }
      
      return dependencies;
    }
  };
});

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
 * Communicator handles the logic for
 * downloading and executing required files and dependencies
 * @file
 */
var Communicator = Fiber.extend(function() {
  return {
    /**
     * The Communicator object is meant to be instantiated once, and have its
     * reference assigned to a location outside of the closure.
     * @constructs Communicator
     */
    init: function (env) {
      this.env = env;
      this.clearCaches();
      this.alreadyListening = false;
      this.socket = null;
      this.socketInProgress = false;
      this.socketQueue = [];
      this.socketQueueCache = {};
      this.downloadCompleteQueue = {};
    },

    /**
     * clear list of socket connections and list of downloaded files
     * @method Communicator.clearCaches
     * @public
     */
    clearCaches: function () {
      self.downloadCompleteQueue = {};
    },

    /**
     * A noop for just running the callback. Useful for a passthrough
     * operation
     * @param {string} moduleId - The id of the module to be fetched
     * @param {string} url - The location of the script to be fetched
     * @param {object} callback - The function callback to execute after the file is retrieved and loaded
     * @public
     */
    noop: function (moduleId, url, callback) {
      callback('');
    },

    /**
     * retrieve file via download or cache keyed by the given url
     * @method Communicator.get
     * @param {string} moduleId - The id of the module to be fetched
     * @param {string} url - The location of the script to be fetched
     * @param {object} callback - The function callback to execute after the file is retrieved and loaded
     * @public
     */
    get: function (moduleId, url, callback) {
      if (!this.downloadCompleteQueue[url]) {
        this.downloadCompleteQueue[url] = [];
      }

      debugLog('Communicator (' + url + ')', 'requesting');

      if (!this.env.config.relayFile) {
        var cachedResults = this.readFromCache(url);
        if (cachedResults) {
          debugLog('Communicator (' + url + ')', 'retireved from cache. length: ' + cachedResults.length);
          callback(cachedResults);
          return;
        }
      }

      debugLog('Communicator (' + url + ')', 'queued');
      if (this.downloadCompleteQueue[url].length) {
        this.downloadCompleteQueue[url].push(callback);
        debugLog('Communicator (' + url + ')', 'request already in progress');
        return;
      }
      this.downloadCompleteQueue[url].push(callback);
      
      // local xhr
      if (!this.env.config.relayFile) {
        this.sendViaXHR(url);
        return;
      }
      
      // remote xhr
      this.sendViaIframe(url);
    },
  
    addSocketQueue: function(lUrl) {
      if (!this.socketQueueCache[lUrl]) {
        this.socketQueueCache[lUrl] = 1;
        this.socketQueue.push(lUrl);
      }
    },
  
    beginListening: function() {
      var self = this;
      if (this.alreadyListening) {
        return;
      }
      this.alreadyListening = true;
    
      addListener(window, 'message', function(e) {
        var commands, command, params;
    
        if (!self.env.config.relayFile) {
          return;
        }
    
        if (self.getDomainName(e.origin) !== self.getDomainName(self.env.config.relayFile)) {
          return;
        }
    
        commands = e.data.split(/:/);
        command = commands.shift();

        switch (command) {
        case 'ready':
          self.socketInProgress = false;
          (function() {
            var lQueue = self.socketQueue;
            self.socketQueue = [];
            self.socketQueueCache = {};
            for (var i = 0, len = lQueue.length; i < len; i++) {
              self.sendMessage(self.socket.contentWindow, self.env.config.relayFile, 'fetch', {
                url: lQueue[i]
              });
            }
          }());
          break;
        case 'fetchFail':
        case 'fetchOk':
          params = JSON.parse(commands.join(':'));
          self.resolveCompletedFile(params.url, params.status, params.responseText);
        }
      });
    },

    /**
     * read cached file contents from local storage
     * @function
     * @param {string} url - url key that the content is stored under
     * @private
     * @returns the content that is stored under the url key
     *
     */
    readFromCache: function(url) {
      // lscache and passthrough
      if (this.env.config.expires > 0) {
        return this.env.lscache.get(url);
      }
      else {
        return null;
      }
    },

    /**
     * function that resolves all callbacks that are associated
     * to the loaded file
     * @function
     * @param {string} url - The location of the module that has loaded
     * @param {int} statusCode - The result of the attempt to load the file at url
     * @param {string} contents - The contents that were loaded from url
     * @private
     */
    resolveCompletedFile: function(url, statusCode, contents) {
      statusCode = 1 * statusCode;
      debugLog('Communicator (' + url + ')', 'status ' + statusCode + '. Length: ' +
          ((contents) ? contents.length : 'NaN'));

      // write cache
      if (statusCode === 200 && !this.env.config.relayFile && this.env.config.expires > 0) {
        this.env.lscache.set(url, contents, this.env.config.expires);
      }
    
      // all non-200 codes create a runtime error that includes the error code
      if (statusCode !== 200) {
        contents = 'throw new Error(\'Error ' + statusCode + ': Unable to retrieve ' + url + '\');';
      }

      // locate all callbacks associated with the URL
      each(this.downloadCompleteQueue[url], function (cb) {
        cb(contents);
      });
      this.downloadCompleteQueue[url] = [];
    },

    /**
     * Creates a standard xmlHttpRequest
     * @function
     * @param {string} url - url where the content is located
     * @private
     */
    sendViaIframe: function(url) {
      this.beginListening();
      var self = this;
      if (this.socket && !this.socketInProgress) {
        this.sendMessage(this.socket.contentWindow, this.env.config.relayFile, 'fetch', {
          url: url
        });
      }
      else if (this.socket && this.socketInProgress) {
        this.addSocketQueue(url);
        return;
      }
      else {
        this.socketInProgress = true;
        this.addSocketQueue(url);
        var iframeSrc = this.env.config.relayFile;
      
        this.socket = document.createElement('iframe');
        iframeSrc += (iframeSrc.indexOf('?') < 0) ? '?' : '&';
        iframeSrc += 'injectReturn=' + encodeURIComponent(location.href);
        this.socket.src = iframeSrc;
      
        this.socket.style.visibility = 'hidden';
        this.socket.style.border = 0;
        this.socket.style.width = '1px';
        this.socket.style.height = '1px';
        this.socket.style.left = '-5000px';
        this.socket.style.top = '-5000px';
        this.socket.style.opacity = '0';

        window.setTimeout(function() {
          if (!document.body.firsChild) {
            document.body.appendChild(self.socket);
          }
          else {
            document.body.insertBefore(self.socket, document.body.firstChild);
          }
        });
      }
    },

    /**
     * Get contents via xhr for cross-domain requests
     * @function
     * @param {string} url - url where the content is located
     * @private
     */
    sendViaXHR: function(url) {
      var self = this;
      var xhr = getXHR();
      xhr.open('GET', url);
      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          self.resolveCompletedFile(url, xhr.status, xhr.responseText);
        }
      };
      xhr.send(null);
    }
  };
});

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
    delete window[guid];
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
          mainTrace = normalizeStack(err);
          offsetTrace = normalizeStack(module.__error_line);
          mainTracePieces = mainTrace[0].split(/:/);
          offsetTracePieces = offsetTrace[0].split(/:/);
          
          actualLine =  mainTracePieces[mainTracePieces.length - 2] - offsetTracePieces[offsetTracePieces.length - 2];
          actualLine = actualLine - 1;
          
          actualChar = mainTracePieces[mainTracePieces.length - 1];
          
          errorMessage = errorMessage + ' @ Line: ' + actualLine + ' Column: ' + actualChar + ' ';
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

        next(contents);
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
 * RequireContext is an instance object which provides the
 * CommonJS and AMD interfaces of require(string),
 * require(array, callback) ensure (require.ensure),
 * run (require.run), and define.
 * @file
**/
var RequireContext = Fiber.extend(function() {

  return {
    /**
     * Creates a new RequireContext
     * @constructs RequireContext
     * @param {object} env - The context to run in
     * @param {String} id - the current module ID for this context
     * @param {String} path - the current module URL for this context
     * @param {Array} qualifiedIds - a (from)-joined collection of paths
     * @public
     */
    init: function (env, id, path, qualifiedIds) {
      this.env = env;
      this.id = id || null;
      this.path = path || null;
      this.qualifiedIds = qualifiedIds || [];
    },

    /**
     * Log an operation for this context
     * @method RequireContext#log
     * @param {String} message - the message to log
     * @protected
     */
    log: function (message) {
      debugLog('RequireContext for ' + this.path, message);
    },

    /**
     * get the path associated with this context
     * @method RequireContext#getPath
     * @public
     * @returns {String} the path for the current context
     */
    getPath: function () {
      if (!this.env.config.moduleRoot) {
        throw new Error('moduleRoot must be defined. Please use Inject.setModuleRoot()');
      }
      return this.path || this.env.config.moduleRoot;
    },

    /**
     * get the ID associated with this context
     * @method RequireContext#getId
     * @public
     * @returns {String} the id of the current context
     */
    getId: function () {
      return this.id || '';
    },

    /**
     * The CommonJS and AMD require interface<br>
     * CommonJS: <strong>require(moduleId)</strong><br>
     * AMD: <strong>require(moduleList, callback)</strong>
     * @method RequireContext#require
     * @param {String|Array} moduleIdOrList - a string (CommonJS) or Array (AMD) of modules to include
     * @param {Function} callback - a callback (AMD) to run on completion
     * @public
     * @returns {Object|null} the object at the module ID (CommonJS) or null (AMD)
     * @see <a href="http://wiki.commonjs.org/wiki/Modules/1.0">http://wiki.commonjs.org/wiki/Modules/1.0</a>
     * @see <a href="https://github.com/amdjs/amdjs-api/wiki/require">https://github.com/amdjs/amdjs-api/wiki/require</a>
     */
    require: function (moduleIdOrList, callback) {
      var module;
      var identifiers = [];
      var identifierCache = {};
      var identifier;
      var assignedModule;
      var localQualifiedId;
      var qualifiedId;
      var i;
      var len;

      if (typeof(moduleIdOrList) === 'string') {
        this.log('CommonJS require(string) of ' + moduleIdOrList);
        if (/^[\d]+$/.test(moduleIdOrList)) {
          throw new Error('require() must be a string containing a-z, slash(/), dash(-), and dots(.)');
        }

        // try to get the module a couple different ways
        identifier = this.env.rulesEngine.resolveModule(moduleIdOrList, this.getId());
        localQualifiedId = this.env.requireContext.qualifiedId(identifier, this.id);
        
        identifiers = [ identifier, localQualifiedId ];
        identifierCache[identifier] = 1;
        identifierCache[localQualifiedId] = 1;
        
        // add all possible search paths
        for (i = 0, len = this.qualifiedIds.length; i < len; i++) {
          qualifiedId = this.env.requireContext.qualifiedId(identifier, this.qualifiedIds[i]);
          if (!identifierCache[qualifiedId]) {
            identifiers.push(qualifiedId);
            identifierCache[qualifiedId] = 1;
          }
        }
        
        for (i = 0, len = identifiers.length; !module && i < len; i++) {
          module = this.env.executor.getModule(identifiers[i]);
        }
        
        // still no module means it was never seen in a loading path
        if (!module) {
          throw new Error('module ' + moduleIdOrList + ' is not available');
        }
        
        // if the module has an error, we need to throw it
        if (module.__error) {
          throw module.__error;
        }
        
        // now it's safe to return the exports
        return module.exports;
      }

      // AMD require
      this.log('AMD require(Array) of ' + moduleIdOrList.join(', '));
      var resolved = [];
      this.ensure(moduleIdOrList, proxy(function (localRequire) {
        for (var i = 0, len = moduleIdOrList.length; i < len; i++) {
          switch(moduleIdOrList[i]) {
          case 'require':
            resolved.push(localRequire);
            break;
          case 'module':
          case 'exports':
            throw new Error('require(array, callback) doesn\'t create a module. You cannot use module/exports here');
          default:
            resolved.push(localRequire(moduleIdOrList[i]));
          }
        }
        callback.apply(context, resolved);
      }, this));
    },

    /**
     * the CommonJS require.ensure interface based on the async/a spec
     * @method RequireContext#ensure
     * @param {Array} moduleList - an array of modules to load
     * @param {Function} callback - a callback to run when all modules are loaded
     * @public
     * @see <a href="http://wiki.commonjs.org/wiki/Modules/Async/A">http://wiki.commonjs.org/wiki/Modules/Async/A</a>
     */
    ensure: function (moduleList, callback) {
      if (Object.prototype.toString.call(moduleList) !== '[object Array]') {
        throw new Error('require.ensure() must take an Array as the first argument');
      }

      this.log('CommonJS require.ensure(array) of ' + moduleList.join(', '));

      // strip builtins (CommonJS doesn't download or make these available)
      moduleList = this.env.analyzer.stripBuiltins(moduleList);

      var require = proxy(this.require, this);
      this.process(moduleList, function(root) {
        if (typeof callback == 'function') {
          callback(require);
        }
      });
    },

    /**
     * Run a module as a one-time approach. This is common verbage
     * in many AMD based systems
     * @method RequireContext#run
     * @param {String} moduleId - the module ID to run
     * @public
     */
    run: function (moduleId) {
      this.log('AMD require.run(string) of ' + moduleId);
      this.ensure([moduleId]);
    },

    /**
     * Define a module with its arguments. Define has multiple signatures:
     * <ul>
     *  <li>define(id, dependencies, factory)</li>
     *  <li>define(id, factory)</li>
     *  <li>define(dependencies, factory)</li>
     *  <li>define(factory)</li>
     * </ul>
     * @method RequireContext#define
     * @param {string} id - if provided, the name of the module being defined
     * @param {Array} dependencies - if provided, an array of dependencies for this module
     * @param {Object|Function} factory - an object literal that defines the module or a function to run that will define the module
     * @public
     * @see <a href="https://github.com/amdjs/amdjs-api/wiki/AMD">https://github.com/amdjs/amdjs-api/wiki/AMD</a>
     */
    define: function () {
      var args = Array.prototype.slice.call(arguments, 0);
      var id = null;
      var dependencies = ['require', 'exports', 'module'];
      var dependenciesDeclared = false;
      var factory = {};
      var remainingDependencies = [];
      var resolvedDependencyList = [];
      var tempModuleId = null;

      // these are the various AMD interfaces and what they map to
      // we loop through the args by type and map them down into values
      // while not efficient, it makes this overloaed interface easier to
      // maintain
      var interfaces = {
        'string array object': ['id', 'dependencies', 'factory'],
        'string object':       ['id', 'factory'],
        'array object':        ['dependencies', 'factory'],
        'object':              ['factory']
      };
      var key = [];
      var value;
      var i;
      for (i = 0, len = args.length; i < len; i++) {
        if (Object.prototype.toString.apply(args[i]) === '[object Array]') {
          key.push('array');
        }
        else if (typeof(args[i]) === 'object' || typeof(args[i]) === 'function') {
          key.push('object');
        }
        else {
          key.push(typeof(args[i]));
        }
      }
      key = key.join(' ');

      if (!interfaces[key]) {
        throw new Error('You did not use an AMD compliant interface. Please check your define() calls');
      }

      key = interfaces[key];
      for (i = 0, len = key.length; i < len; i++) {
        value = args[i];
        switch (key[i]) {
        case 'id':
          id = value;
          break;
        case 'dependencies':
          dependencies = value;
          dependenciesDeclared = true;
          break;
        case 'factory':
          factory = value;
          break;
        }
      }

      // handle anonymous modules
      if (!id) {
        currentExecutingAMD = this.env.executor.getCurrentExecutingAMD();
        if (currentExecutingAMD) {
          id = currentExecutingAMD.id;
        }
        else {
          throw new Error('Anonymous AMD module used, but it was not included as a dependency. This is most often caused by an anonymous define() from a script tag.');
        }
        this.log('AMD identified anonymous module as ' + id);
      }      
      
      this.process(id, dependencies, function(root) {
        // don't bobther with the artificial root we created
        if (!root.data.resolvedId) {
          return;
        }
        // all modules have been ran, now to deal with this guy's args
        var resolved = [];
        var deps = (dependenciesDeclared) ? dependencies : ['require', 'exports', 'module'];
        var require = this.env.requireContext.createRequire(root.data.resolvedId, root.data.resolvedUrl);
        var module = this.env.executor.createModule(root.data.resolvedId, this.env.requireContext.qualifiedId(root), root.data.resolvedUrl);
        var result;
        for (var i = 0, len = deps.length; i < len; i++) {
          switch(deps[i]) {
          case 'require':
            resolved.push(require);
            break;
          case 'module':
            resolved.push(module);
            break;
          case 'exports':
            resolved.push(module.exports);
            break;
          default:
            resolved.push(require(deps[i]));
          }
        }
        if (typeof factory === 'function') {
          result = factory.apply(module, resolved);
          if (result) {
            module.exports = result;
          }
        }
        else if (typeof factory === 'object') {
          module.exports = factory;
        }
        module.amd = true;
        module.exec = true;
      });
    },
    
    /**
     * Process all the modules selected by the various CJS / AMD interfaces
     * builds a tree to handle the dependency download and execution
     * upon completion, calls the provided callback, returning the root node
     * @method RequireContext#process
     * @param {Array} dependencies - an array of dependencies to process
     * @param {Function} callback - a function called when the module tree is downloaded and processed
     * @private
     */
    process: function(possibleId) {
      var id, dependencies, callback;
      
      if (typeof possibleId !== 'string') {
        id = this.id;
        dependencies = arguments[0];
        callback = arguments[1];
      }
      else {
        id = arguments[0];
        dependencies = arguments[1];
        callback = arguments[2];
      }
      
      var root = new this.env.TreeNode();
      var count = dependencies.length;
      var node;
      var runner;
      var runners = [];
      var self = this;
      var resolveCount = function() {
        if (count === 0 || --count === 0) {
          runner = new self.env.TreeRunner(self.env, root);
          runner.execute(function() {
            callback.call(self, root);
          });
        }
      };
      root.data.originalId = id;
      root.data.resolvedId = id;
      root.data.resolvedUrl = this.env.rulesEngine.resolveFile(id, this.path);
      
      if (dependencies.length) {
        for (i = 0, len = dependencies.length; i < len; i++) {
          if (BUILTINS[dependencies[i]]) {
            resolveCount();
            continue;
          }
          
          // add the node always at this point, we just may not need
          // to download it.
          node = new this.env.TreeNode();
          node.data.originalId = dependencies[i];
          root.addChild(node);
          
          if (this.env.executor.getModule(dependencies[i])) {
            resolveCount();
            continue;
          }
          else if (this.env.executor.getModule(this.env.requireContext.qualifiedId(this.env.rulesEngine.resolveModule(node.data.originalId, root.data.resolvedId), node))) {
            resolveCount();
            continue;
          }
          else {
            runner = new this.env.TreeRunner(this.env, node);
            runners.push(runner);
            runner.download(resolveCount);
          }
        }
      }
      else {
        resolveCount();
      }
    },
    
    /**
     * create a require() method within a given context path
     * relative require() calls can be based on the provided
     * id and path
     * @method RequireContext.createRequire
     * @param {string} id - the module identifier for relative module IDs
     * @param {string} path - the module path for relative path operations
     * @public
     * @returns a function adhearing to CommonJS and AMD require()
     */
    createRequire: function (id, path, qualifiedIds) {
      var req = new RequireContext(this.env, id, path, qualifiedIds);
      var require = proxy(req.require, req);
      var self = this;

      require.ensure = proxy(req.ensure, req);
      require.run = proxy(req.run, req);
      // resolve an identifier to a URL (AMD compatibility)
      require.toUrl = function (identifier) {
        var resolvedId = self.env.rulesEngine.resolveModule(identifier, id);
        var resolvedPath = self.env.rulesEngine.resolveFile(resolvedId, '', true);
        return resolvedPath;
      };
      return require;
    },

    /**
     * create a define() method within a given context path
     * relative define() calls can be based on the provided
     * id and path
     * @method RequireContext.createDefine
     * @param {string} id - the module identifier for relative module IDs
     * @param {string} path - the module path for relative path operations
     * @param {boolean} disableAMD - if provided, define.amd will be false, disabling AMD detection
     * @public
     * @returns a function adhearing to the AMD define() method
     */
    createDefine: function (id, path, disableAMD) {
      var req = new RequireContext(this.env, id, path);
      var define = proxy(req.define, req);
      define.amd = (disableAMD) ? false : {};
      return define;
    },

    /**
     * generate a Qualified ID
     * A qualified ID behaves differently than a module ID. Based on it's parents,
     * it refers to the ID as based on the chain of modules that were executed to
     * invoke it. While this may be a reference to another module, a qualified ID is
     * the real source of truth for where a module may be found
     * @method RequireContext.qualifiedId
     * @public
     * @param {Object} rootOrId - either a {TreeNode} or {String} representing the current ID
     * @param {String} qualifiedId - if provided, the qualfied ID is used instead of parent references
     * @returns {String}
     */
    qualifiedId: function(rootOrId, qualifiedId) {
      var out = [];
  
      if (typeof rootOrId === 'string') {
        if (qualifiedId) {
          return [rootOrId, qualifiedId].join('(from)');
        }
        else {
          return rootOrId;
        }
      }
      else {
        rootOrId.parents(function(node) {
          if (node.data.resolvedId) {
            out.push(node.data.resolvedId);
          }
        });
        return out.join('(from)');
      }
    },

    /**
     * Creates a synchronous define() function as used inside of the Inject Sandbox
     * Unlike a global define(), this local define already has a module context and
     * a local require function. It is used inside of the sandbox because at
     * execution time, it's assumed all dependencies have been resolved. This is
     * a much lighter version of RequireContext#define
     * @method RequireContext.createInlineDefine
     * @public
     * @param {Object} module - a module object from the Executor
     * @param {Function} require - a synchronous require function
     * @returns {Function}
     */
    createInlineDefine: function(module, require) {
      var define = function() {
        // this is a serial define and is no longer functioning asynchronously',
        function isArray(a) {
          return (Object.prototype.toString.call(a) === '[object Array]');
        }
        var deps = [];
        var depends = ['require', 'exports', 'module'];
        var factory = {};
        var result;
        for (var i = 0, len = arguments.length; i < len; i++) {
          if (isArray(arguments[i])) {
            depends = arguments[i];
            break;
          }
        }
        factory = arguments[arguments.length - 1];
        for (var d = 0, dlen = depends.length; d < dlen; d++) {
          switch(depends[d]) {
          case 'require':
            deps.push(require);
            break;
          case 'module':
            deps.push(module);
            break;
          case 'exports':
            deps.push(module.exports);
            break;
          default:
            deps.push(require(depends[d]));
          }
        }
        if (typeof factory === 'function') {
          result = factory.apply(module, deps);
          if (result) {
            module.exports = result;
          }
        }
        else if (typeof factory === 'object') {
          module.exports = factory;
        }
        module.amd = true;
        module.exec = true;
      };
      define.amd = {};
      return define;
    }
  };
});

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
 * The Rules Engine is used to handle the deriving of pointcut and path
 * information for a given module identifier. It maintains an internal
 * rules table for the environment, and also caches the results of its
 * resolution.
 * @file
**/

var RulesEngine = Fiber.extend(function() {

  /**
   * Return the "base" directory of a given path
   * @method RulesEngine.basedir
   * @private
   * @param {String} dir - the directory or path to get the basedir of
   */
  var basedir = function(dir) {
    dir = dir.split('/');
    dir.pop();
    dir = dir.join('/');
    return dir;
  };

  return {
    /**
     * Create a RulesEngine Object
     * @constructs RulesEngine
     * @param {Object} env - The context to run in
     */
    init: function (env) {
      this.env = env;
      this.clearRules();
    },

    /**
     * Clear all the rules (and thus all the caches)
     * Used to reset the rules engine
     * @method RulesEngine.clearRules
     */
    clearRules: function() {
      this.moduleRules = [];
      this.fileRules = [];
      this.contentRules = [];
      this.fetchRules = [];
      this.aliasRules = {};
      this.revAliasRules = {};
      this.dirty = {
        moduleRules: true,
        fileRules: true,
        contentRules: true,
        fetchRules: true,
        aliasRules: true,
        revAliasRules: true
      };
      this.caches = {
        moduleRules: {},
        fileRules: {},
        contentRules: {},
        fetchRules: {},
        aliasRules: {},
        revAliasRules: {}
      };

      // deprecated
      // deprecated legacy pointcuts from addRule
      this.addRuleCounter = 0;
      this.addRulePointcuts = {};
      // end deprecated
    },

    /**
     * Add a rule to the collection
     * @method RulesEngine.add
     * @private
     * @param {String} type - the type of rule to add
     * @param {Regex|String} matches - what does this match against
     * @param {Function} rule - the rule to apply
     * @param {Object} options - the options for this rule
     */
    add: function (type, matches, rule, options) {
      this.dirty[type] = true;
      options = options || {};
      var weight = options.weight || this[type].length;
      var last = options.last || false;
      this[type].push({
        matches: matches,
        fn: (typeof rule === 'function') ? rule : function() { return rule; },
        weight: weight,
        last: last,
        all: options
      });
    },

    /**
     * Clear a specific cache
     * @method RulesEngine.clearCache
     * @private
     * @param {String} type - the type of cache to clear
     */
    clearCache: function(type) {
      this.caches[type] = {};
    },

    /**
     * Sort a collection of rules by weight
     * @method RulesEngine.sort
     * @private
     * @param {String} type - the type of rules to sort
     */
    sort: function (type) {
      if (!this.dirty[type]) {
        return;
      }
      this.clearCache(type);
      this[type].sort(function (a, b) {
        return b.weight - a.weight;
      });
      this.dirty[type] = false;
    },

    /**
     * Get the deprecated pointcuts. This method exists
     * while the addRule structure is deprecated
     * @deprecated
     * @method RulesEngine.getDeprecatedPointcuts
     * @param {String} moduleId - the module id to get pointcuts for
     * @returns {Array}
     */
    getDeprecatedPointcuts: function(moduleId) {
      return this.addRulePointcuts[moduleId] || [];
    },

    /**
     * Add a rule to the database. It can be called as:<br>
     * addRule(regexMatch, weight, ruleSet)<br>
     * addRule(regexMatch, ruleSet)<br>
     * addRule(ruleSet)<br>
     * The ruleSet object to apply contains a set of options.
     * <ul>
     * <li>ruleSet.matches: replaces regexMatch if found</li>
     * <li>ruleSet.weight: replaces weight if found</li>
     * <li>ruleSet.last: if true, no further rules are ran</li>
     * <li>ruleSet.path: a path to use instead of a derived path<br>
     *  you can also set ruleSet.path to a function, and that function will
     *  passed the current path for mutation</li>
     * <li>ruleSet.pointcuts.afterFetch: a function to mutate the file after retrieval, but before analysis</li>
     * </ul>
     * @method RulesEngine.addRule
     * @param {RegExp|String} matches - a stirng or regex to match on
     * @param {int} weight - a weight for the rule. Larger values run later
     * @param {Object} rule - an object containing the rules to apply
     * @public
     * @deprecated
     */
    addRule: function (matches, weight, rule) {
      if (!rule) {
        rule = weight;
        weight = null;
      }
      if (!rule) {
        rule = {};
      }
      if (typeof rule === 'string') {
        rule = {
          path: rule
        };
      }
      if (!rule.weight) {
        rule.weight = this.addRuleCounter++;
      }

      if (rule.path) {
        this.addFileRule(matches, rule.path, {
          weight: rule.weight,
          last: rule.last,
          useSuffix: rule.useSuffix,
          afterFetch: (rule.pointcuts && rule.pointcuts.afterFetch) ? rule.pointcuts.afterFetch : null
        });
      }
      else if (rule.pointcuts && rule.pointcuts.afterFetch) {
        this.addContentRule(matches, rule.pointcuts.afterFetch, {
          weight: rule.weight
        });
      }
    },

    /**
     * Add a module ID rule to the system
     * A module rule can convert one module ID to another. This is
     * useful for maintaining module ID's even when you move modules
     * around in a backwards incompatible way
     * @method RulesEngine.addModuleRule
     * @param {String|Regex} matchesId - if the module matches this pattern, then rule will be used
     * @param {String|Function} rule - a string or function that describes how to transform the module id
     * @param {Object} options - the additional options for this rule such as "last" (last rule to run), "weight" (change the ordering)
     */
    addModuleRule: function (matchesId, rule, options) {
      return this.add('moduleRules', matchesId, rule, options);
    },

    /**
     * Add a file path rule to the system
     * A file rule can convert one file path to another. This is useful
     * for redirecting one link to another. For example, a base path of "jquery"
     * can be redirected to a specific jQuery version.
     * @method RulesEngine.addFileRule
     * @param {String|Regex} matchesPath - if the path matches this pattern, then rule will be used
     * @param {String|Function} rule - a string or function that describes how to transform the path
     * @param {Object} options - the additional options for this rule such as "last" (last rule to run), "weight" (change the ordering)
     */
    addFileRule: function (matchesPath, rule, options) {
      return this.add('fileRules', matchesPath, rule, options);
    },

    /**
     * Add a content transformation rule
     * Content transformations allow you to change the file's contents itself,
     * without altering the original file. This allows you to do things like
     * <ul>
     *   <li>Shim "jQuery" and store it in module.exports</li>
     *   <li>Download a non-js file and convert it to a JS object (like our plugins)</li>
     *   <li>Replace the file with an altered version</li>
     * </ul>
     * @method RulesEngine.addFileRule
     * @param {String|Regex} matchesPath - if the path matches this pattern, then rule will be used
     * @param {RulesEngine~contentRuleCallback} rule - a function that describes how to transform the content
     * @param {Object} options - the additional options for this rule
     */
    /**
     * The content rule function allows you to asychronously change a file
     * @callback RulesEngine~contentRuleCallback
     * @param {Function} next - a function to call on completion, takes "error" and "result"
     * @param {String} content - the current content
     */
    addContentRule: function (matchesPath, rule, options) {
      return this.add('contentRules', matchesPath, rule, options);
    },

    /**
     * Add a path retrieval rule
     * Path retrieval rules allow us to change how we get our content. This allows
     * specific modules to bypass the default communicator fetch process.
     * @method RulesEngine.addFetchRule
     * @param {String|Regex} matchesId - if the id matches this pattern, then rule will be used
     * @param {RulesEngine~fetchRuleCallback} rule - a function that describes how to transform the path
     * @param {Object} options - the additional options for this rule
     */
    /**
     * The fetch rule function allows you to asychronously download the file
     * @callback RulesEngine~fetchRuleCallback
     * @param {Function} next - a function to call on completion, takes "error" and "result"
     * @param {String} content - the current content
     * @param {Object} resolver - a resolver with two methods: module() for module resolution, and url()
     * @param {Communicator} communicator - a partial Communicator object, with a get() function
     * @param {Object} options - additional options such as a parent reference
     */
    addFetchRule: function (matchesId, rule, options) {
      return this.add('fetchRules', matchesId, rule, options);
    },

    /**
     * Add a package alias. Useful for installing a module into a global location
     * Packages are stored as "originalName": [aliases]
     * and "alias": "originalName".
     * @method RulesEngine.addPackage
     * @param {String} resolvedId - the resolved ID to match against
     * @param {String} alsoKnownAs - the alternate ID for this matching string
     */
     // jquery-1.7 aka jquery
    addPackage: function (resolvedId, alsoKnownAs) {
      this.dirty.aliasRules = true;
      if (this.revAliasRules[resolvedId]) {
        throw new Error('An alias can only map back to 1 origin');
      }
      if (!this.aliasRules[resolvedId]) {
        this.aliasRules[resolvedId] = [];
      }

      this.aliasRules[resolvedId].push(alsoKnownAs);
      this.revAliasRules[alsoKnownAs] = resolvedId;
    },

    /**
     * Resolve an identifier after applying all rules
     * @method RulesEngine.resolveModule
     * @param {String} moduleId - the identifier to resolve
     * @param {String} relativeTo - a base path for relative identifiers
     * @public
     * @returns {String} the resolved identifier
     */
    resolveModule: function (moduleId, relativeTo) {
      moduleId = moduleId || '';
      relativeTo = relativeTo || '';

      this.sort('moduleRules');
      var lastId = moduleId;
      var i = 0;
      var rules = this.moduleRules;
      var len = rules.length;
      var isMatch = false;
      var matches;
      var fn;

      for (i; i < len; i++) {
        matches = rules[i].matches;
        fn = rules[i].fn;

        isMatch = false;
        if (typeof matches === 'string') {
          if (matches === moduleId) {
            isMatch = true;
          }
        }
        else if (typeof matches.test === 'function') {
          isMatch = matches.test(moduleId);
        }

        if (isMatch) {
          lastId = fn(lastId);
          if (matches.last) {
            break;
          }
        }
      }

      // shear off all leading slashes
      lastId = lastId.replace(LEADING_SLASHES_REGEX, '');

      // we don't need/want relativeTo if there's no leading .
      if (lastId.indexOf('.') !== 0) {
        relativeTo = null;
      }

      // adjust relativeTo to a basedir if provided
      if (relativeTo) {
        relativeTo = basedir(relativeTo);
      }

      // compute the relative path
      lastId = this.getRelative(lastId, relativeTo);

      // strip leading / as it is not needed
      lastId = lastId.replace(LEADING_SLASHES_REGEX, '');

      // cache and return
      this.caches.moduleRules[moduleId] = lastId;
      return lastId;
    },

    /**
     * resolve a URL relative to a base path
     * @method RulesEngine.resolveFile
     * @param {String} path - the path to resolve
     * @param {String} relativeTo - a base path for relative URLs
     * @param {Boolean} noSuffix - do not use a suffix for this resolution
     * @public
     * @returns {String} a resolved URL
     */
    resolveFile: function (path, relativeTo, noSuffix) {
      path = path || '';
      relativeTo = relativeTo || '';

      this.sort('fileRules');
      var lastPath = path;
      var i = 0;
      var rules = this.fileRules;
      var len = rules.length;
      var isMatch = false;
      var matches;
      var fn;
      var env = this.env;

      // deprecated
      var deprecatedPointcuts = [];
      // end deprecated

      for (i; i < len; i++) {
        matches = rules[i].matches;
        fn = rules[i].fn;

        isMatch = false;
        if (typeof matches === 'string') {
          if (matches === path) {
            isMatch = true;
          }
        }
        else if (typeof matches.test === 'function') {
          isMatch = matches.test(path);
        }

        if (isMatch) {
          lastPath = fn(lastPath);

          // deprecated
          if (rules[i].all && rules[i].all.afterFetch) {
            deprecatedPointcuts.push(rules[i].all.afterFetch);
          }
          // end deprecated

          if (rules[i].last) {
            break;
          }
        }
      }

      // if no module root, freak out
      if (!env.config.moduleRoot && typeof console != 'undefined' && typeof console.log == 'function') {
        console.log('Without moduleRoot defined, Inject will default to the URL of the current page. This may cause unexpected behavior');
      }

      if (!lastPath) {
        // store deprecated pointcuts
        // deprecated
        this.addRulePointcuts[lastPath] = deprecatedPointcuts;
        // end deprecated

        // store and return
        this.caches.fileRules[path] = lastPath;
        return lastPath;
      }

      // if there is no basedir function from the user, we need to slice off the last segment of relativeTo
      // otherwise, we can use the baseDir() function
      // otherwise (no relativeTo) it is relative to the moduleRoot
      if (relativeTo && !env.config.baseDir) {
        relativeTo = relativeTo.replace(PROTOCOL_REGEX, PROTOCOL_EXPANDED_STRING).split('/');
        if (relativeTo[relativeTo.length - 1] && relativeTo.length !== 1) {
          // not ending in /
          relativeTo.pop();
        }
        relativeTo = relativeTo.join('/').replace(PROTOCOL_EXPANDED_REGEX, PROTOCOL_STRING);
      }
      else if (relativeTo) {
        relativeTo = env.config.baseDir(relativeTo);
      }
      else if (env.config.moduleRoot) {
        relativeTo = env.config.moduleRoot;
      }
      else {
        relativeTo = location.pathname;
      }

      // exit early on resolved http URL
      if (ABSOLUTE_PATH_REGEX.test(lastPath)) {
        this.caches.fileRules[path] = lastPath;
        return lastPath;
      }

      // take off the :// to replace later
      relativeTo = relativeTo.replace(PROTOCOL_REGEX, PROTOCOL_EXPANDED_STRING);
      lastPath = lastPath.replace(PROTOCOL_REGEX, PROTOCOL_EXPANDED_STRING);

      // #169: query strings in base
      if (/\?/.test(relativeTo)) {
        lastPath = relativeTo + lastPath;
      }
      else {
        lastPath = this.getRelative(lastPath, relativeTo);
      }

      // restore the ://
      lastPath = lastPath.replace(PROTOCOL_EXPANDED_REGEX, PROTOCOL_STRING);

      // add a suffix if required
      if (!noSuffix && env.config.suffixes && !FILE_SUFFIX_REGEX.test(lastPath)) {
        lastPath = lastPath + BASIC_FILE_SUFFIX;
      }

      // store deprecated pointcuts
      // deprecated
      this.addRulePointcuts[lastPath] = deprecatedPointcuts;
      // end deprecated

      // store and return
      this.caches.fileRules[path] = lastPath;
      return lastPath;
    },

    /**
     * Get the alternate names for a package
     * Packages are stored as "originalName": [aliases]
     * and "alias": "originalName".
     * @method RulesEngine.getAliases
     * @param {String} id - The resolved or Alias ID to look up
     * @returns {Array} all other known names
     * @public
     */
    getAliases: function (id) {
      return this.aliasRules[id] || [];
    },

    /**
     * Get the alternate names for a package
     * Packages are stored as "originalName": [aliases]
     * and "alias": "originalName".
     * @method RulesEngine.getOriginalName
     * @param {String} id - The resolved or Alias ID to look up
     * @returns {String} a matching alias if found
     * @public
     */
    getOriginalName: function (alias) {
      return this.revAliasRules[alias] || null;
    },

    /**
     * Get the fetch rules for a given moduleId
     * @method RulesEngine.getFetchRules
     * @param {String} moduleId - The module ID to retrieve fetch rules for
     * @public
     * @returns {Array} A collection of fetch rules for this module ID
     */
    getFetchRules: function (moduleId) {
      // if (!this.dirty.fetchRules && this.caches.fetchRules[moduleId]) {
      //   return this.caches.fetchRules[moduleId];
      // }
      this.sort('fetchRules');

      var i = 0;
      var rules = this.fetchRules;
      var len = rules.length;
      var isMatch = false;
      var matches;
      var fn;
      var matchingRules = [];
      for (i; i < len; i++) {
        matches = rules[i].matches;
        fn = rules[i].fn;

        isMatch = false;
        if (typeof matches === 'string') {
          if (matches === moduleId) {
            isMatch = true;
          }
        }
        else if (typeof matches.test === 'function') {
          isMatch = matches.test(moduleId);
        }

        if (isMatch) {
          matchingRules.push(fn);
        }
      }

      this.caches.contentRules[moduleId] = matchingRules;
      return matchingRules;
    },

    /**
     * Get the content rules for a given path
     * @method RulesEngine.getContentRules
     * @param {String} path - The path to retrieve content rules for
     * @public
     * @returns {Array} A collection of content rules for this path
     */
    getContentRules: function (path) {
      // if (!this.dirty.contentRules && this.caches.contentRules[path]) {
      //   return this.caches.contentRules[path];
      // }
      this.sort('contentRules');

      var i = 0;
      var rules = this.contentRules;
      var len = rules.length;
      var isMatch = false;
      var matches;
      var fn;
      var matchingRules = [];
      var found = false;

      // deprecated
      var deprecatedPointcuts = this.addRulePointcuts[path] || [];
      // end deprecated

      for (i; i < len; i++) {
        matches = rules[i].matches;
        fn = rules[i].fn;

        isMatch = false;
        if (typeof matches === 'string') {
          if (matches === path) {
            isMatch = true;
          }
        }
        else if (typeof matches.test === 'function') {
          isMatch = matches.test(path);
        }

        if (isMatch) {
          matchingRules.push(fn);
        }
      }

      // add any matching deprecated pointcuts
      // deprecated
      each(deprecatedPointcuts, function (depPC) {
        found = false;
        each(matchingRules, function (normalPC) {
          if (normalPC === depPC) {
            found = true;
          }
        });
        if (!found) {
          matchingRules.push(depPC);
        }
      });
      // end deprecated

      this.caches.contentRules[path] = matchingRules;
      return matchingRules;
    },

    /**
     * Dismantles and reassembles a relative path by exploding on slashes
     * @method RulesEngine.getRelative
     * @param {String} id - the initial identifier
     * @param {String} base - the base path for relative declarations
     * @private
     * @returns {String} a resolved path with no relative references
     */
    getRelative: function (id, base) {
      var blownApartURL;
      var resolved = [];
      var piece;
      var i;
      var frags;
      var len;

      base = base || '';

      // exit early on resolved :// in a URL
      if (ABSOLUTE_PATH_REGEX.test(id)) {
        return id;
      }
      
      // begins with a /, path is relative to root
      if (id.indexOf('/') === 0) {
        base = '';
      }

      blownApartURL = [];
      if (base.length) {
        for (i = 0, frags = base.split('/'), len = frags.length; i < len; i++) {
          blownApartURL.push(frags[i]);
        }
      }
      for (i = 0, frags = id.split('/'), len = frags.length; i < len; i++) {
        blownApartURL.push(frags[i]);
      }
      
      for (i = 0, len = blownApartURL.length; i < len; i++) {
        piece = blownApartURL[i];

        if (piece === '.' || (piece === '' && i > 0)) {
          // skip . or "" (was "//" in url at position 0)
          continue;
        }
        else if (piece === '..') {
          // up one directory
          if (resolved.length === 0) {
            throw new Error('could not traverse higher than highest path: ' + id + ', ' + base);
          }
          resolved.pop();
        }
        else {
          // fragment okay, add
          resolved.push(piece);
        }
      }

      resolved = resolved.join('/');
      return resolved;
    }
  };

});

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
 * The TreeNode is a data structure object for building N-ary
 * trees. It also collects methods for iterating on itself
 * via various traversal methods.
 * @file
**/
var TreeNode = Fiber.extend(function() {

  return {
    /**
     * Create a TreeNode
     * @constructs TreeNode
     */
    init: function () {
      this.data = {};
      this.children = [];
      this.left = null;
      this.right = null;
      this.parent = null;
    },

    /**
     * Add a child to the node. It also sets up left
     * and right relationships as well as the parent.
     * @method TreeNode#addChild
     * @param {TreeNode} node - the TreeNode to add
     * @public
     */
    addChild: function (node) {
      var rightChild;
      if (this.children.length > 0) {
        rightChild = this.children[this.children.length - 1];
        node.setLeft(rightChild);
        rightChild.setRight(node);
      }
      this.children.push(node);
      return node.setParent(this);
    },

    /**
     * Get all the children of this node
     * @method TreeNode#getChildren
     * @public
     * @returns {Array} an array of child TreeNode objects
     */
    getChildren: function () {
      return this.children;
    },

    /**
     * An interface for setting the "left" node of the tree
     * @method TreeNode#setLeft
     * @param {TreeNode} node - the node to set
     * @public
     * @returns {TreeNode}
     */
    setLeft: function (node) {
      this.left = node;
      return this.left;
    },

    /**
     * Get the node "left" of the current
     * @method TreeNode#getLeft
     * @public
     * @returns {TreeNode}
     */
    getLeft: function () {
      return this.left;
    },

    /**
     * An interface for setting the "right" node of the tree
     * @method TreeNode#setRight
     * @param {TreeNode} node - the node to set
     * @public
     * @returns {TreeNode}
     */
    setRight: function (node) {
      this.right = node;
      return this.right;
    },

    /**
     * Get the node "right" of the current
     * @method TreeNode#getRight
     * @public
     * @returns {TreeNode}
     */
    getRight: function () {
      return this.right;
    },

    /**
     * An interface for setting the "parent" node of current
     * @method TreeNode#setParent
     * @param {TreeNode} node - the node to set
     * @public
     * @returns {TreeNode}
     */
    setParent: function (node) {
      this.parent = node;
      return this.parent;
    },

    /**
     * Get the node "parent" of the current
     * @method TreeNode#getParent
     * @public
     * @returns {TreeNode}
     */
    getParent: function () {
      return this.parent;
    },
    
    /**
     * Returns all of a requested data element for the parents
     * @method TreeNode#parents
     * @param {String} param - the data paramter to get
     * @param {string} joins - the string to join it
     * @returns {Array} - an array of the parent values
     */
    parents: function(callback) {
      var output = [],
          currentNode = this;
      
      while (currentNode) {
        if (callback) {
          callback(currentNode);
        }
        output.push(currentNode);
        currentNode = currentNode.getParent();
      }
      
      return output;
    },

    /**
     * Perform a postOrder traversal over the tree, optionally running
     * a supplied callback
     * @method TreeNode#postOrder
     * @param {Function} callback - a callback to run for each node
     * @public
     * @returns {Array} the nodes of the tree, ordered by post-order
     */
    postOrder: function (callback) {
      // post order traversal to an array
      // left, right, parent
      var currentNode = this,
          direction = null,
          output = [];

      while (currentNode) {

        if (currentNode.getChildren().length > 0 && direction !== 'up') {
          direction = 'down';
          currentNode = currentNode.getChildren()[0];
          continue;
        }

        // node correct
        output.push(currentNode);
        if (callback) {
          callback(currentNode);
        }
        // end node correct

        if (currentNode.getRight()) {
          direction = 'right';
          currentNode = currentNode.getRight();
          continue;
        }

        if (currentNode.getParent()) {
          direction = 'up';
          currentNode = currentNode.getParent();
          continue;
        }

        return output;
      }
    }
  };
});

  var TreeRunner = Fiber.extend(function() {
  /**
   * Perform a function on the next-tick, faster than setTimeout
   * Taken from stagas / public domain
   * By using window.postMessage, we can immediately queue a function
   * to run on the event stack once the current JS thread has completed.
   * For browsers that do not support postMessage, a setTimeout of 0 is
   * used instead.
   * @method TreeRunner.nextTick
   * @private
   * @param {Function} fn - the function to call on the next tick
   */
  var nextTick = (function() {
    var queue = [],
        hasPostMessage = !!window.postMessage,
        messageName = 'inject-nexttick',
        dirty = false,
        trigger,
        processQueue;
  
    function flushQueue () {
      var lQueue = queue;
      queue = [];
      dirty = false;
      fn = lQueue.shift();
      while (fn) {
        fn();
        fn = lQueue.shift();
      }
    }
  
    function nextTick (fn) {
      queue.push(fn);
      if (dirty) return;
      dirty = true;
      trigger();
    }
  
    if (hasPostMessage) {
      trigger = function () { window.postMessage(messageName, '*'); };
      processQueue = function (event) {
        if (event.source == window && event.data === messageName) {
          if (event.stopPropagation) {
            event.stopPropagation();
          }
          else {
            event.returnValue = false;
          }
          flushQueue();
        }
      };
      nextTick.listener = addListener(window, 'message', processQueue, true);
    }
    else {
      trigger = function () { window.setTimeout(function () { processQueue(); }, 0); };
      processQueue = flushQueue;
    }

    nextTick.removeListener = function () {
      removeListener(window, 'message', processQueue, true);
    };

    return nextTick;
  }());
  
  return {
    /**
     * Construct a Tree Runner Object
     * A tree runner, given a node, is responsible for the download and execution
     * of the root node and any children it encounters.
     * @constructs TreeRunner
     * @param {Object} env - The context to run in
     * @param {TreeNode} root - a Tree Node at the root of this tree
     */
    init: function(env, root) {
      this.env = env;
      this.root = root;
    },
    
    /**
     * Downloads the tree, starting from this node, and spanning into its children
     * @method TreeRunner#download
     * @public
     * @param {Function} downloadComplete - a callback executed when the download is done
     */
    download: function(downloadComplete) {

      var root = this.root,
          self = this,
          rootData = root.data,
          rootParent = root.getParent(),
          communicatorGet;

      // given original id & parent resolved id, create resolved id
      // given resolved id & parent resolved url, create resolved url
      // build a communicator
      // communicator download (async)
      // -- on complete (file)
      // -- transform the contents (rules)
      // -- assign file to child
      // -- extract requires
      // -- for each child, create children, up the children count by 1
      // -- in a next-tick, create a new TreeDownloader at the new child (async)
      // -- -- on complete, decrement children count by 1
      // -- -- when children count hits 0, call downloadComplete()
      if (rootParent) {
        rootData.resolvedId = this.env.rulesEngine.resolveModule(rootData.originalId, rootParent.data.resolvedId);
      }
      else {
        rootData.resolvedId = this.env.rulesEngine.resolveModule(rootData.originalId, '');
      }
      rootData.resolvedUrl = this.env.rulesEngine.resolveFile(rootData.resolvedId);

      // Build a communicator.
      communicatorGet = this.buildCommunicator(root);

      // Download the file via communicator, get back contents
      communicatorGet(rootData.originalId, rootData.resolvedUrl, function(content) {

        // build a flow control to adjust the contents based on rules
        var pointcuts = self.env.rulesEngine.getContentRules(rootData.resolvedUrl),
            contentFlow = new Flow(),
            i = 0,
            len = pointcuts.length;

            addContent = function(fn) {
              contentFlow.seq(function (next, error, contents) {
                try {
                  fn(function(data) {
                    next(null, data);
                  }, contents);
                }
                catch(e) {
                  next(e, contents);
                }
              });
            };

        contentFlow.seq(function (next) {
          next(null, content);
        });

        for (i; i < len; i++) {
          addContent(pointcuts[i]);
        }

        contentFlow.seq(function (next, error, contents) {

          var circular = false,
              searchIndex = {},
              parent = rootParent,
              module,
              qualifiedId;

          if (typeof contents === 'string') {
            rootData.file = contents;
          }
          else {
            rootData.exports = contents;
          }

          // determine if this is circular
          searchIndex[rootData.originalId] = true;
          while(parent && !circular) {
            if (searchIndex[parent.data.originalId]) {
              circular = true;
            }
            else {
              searchIndex[parent.data.originalId] = true;
              parent = parent.getParent();
            }
          }
          rootData.circular = circular;

          // kick off its children
          if (rootData.exports) {
            // when there are exports available, then we prematurely resolve this module
            // this can happen when the an external rule for the communicator has resolved
            // the export object for us
            module = self.env.executor.createModule(rootData.resolvedId, self.env.requireContext.qualifiedId(root), rootData.resolvedUrl);
            module.exec = true;
            module.exports = contents;
            downloadComplete();
          }
          else if (rootData.circular) {
            // circular nodes do not need to download their children (again)
            downloadComplete();
          }
          else {
            // Analyze the file for depenencies and kick off a child download for each one.
            self.downloadDependencies(root, proxy(downloadComplete, self));
          }
        });
      });
    },
    
    /**
     * Executes a tree, starting from the root node
     * In order to ensure a tree has all of its dependencies available
     * a post-order traversal is used
     * http://en.wikipedia.org/wiki/Tree_traversal#Post-order
     * This loads Bottom-To-Top, Left-to-Right
     * @method TreeRunner#execute
     * @public
     * @param {Function} executeComplete - a callback function ran when all execution is done
     */
    execute: function(executeComplete) {

      var nodes = this.root.postOrder(),
          self = this,
          len = nodes.length,
          i = 0,
      
          runNode = function(node) {

            var nodeData = node.data,
                module,
                result;

            if (!nodeData.resolvedId) {
              return;
            }
            
            // executor: create a module
            // if not circular, executor: run module (otherwise, the circular reference begins as empty exports)
            module = self.env.executor.createModule(nodeData.resolvedId, self.env.requireContext.qualifiedId(node), nodeData.resolvedUrl);
            nodeData.module = module;
            
            if (module.exec) {
              return;
            }
            
            if (!nodeData.circular) {
              if (nodeData.exports) {
                // exports came pre set
                module.exports = nodeData.exports;
                module.exec = true;
              }
              else if (typeof nodeData.file === 'string') {
                self.env.executor.runModule(module, nodeData.file);
                module.exec = true;
                // if this is an AMD module, it's exports are coming from define()
                if (!module.amd) {
                  nodeData.exports = module.exports;
                }
              }
            }
          };
      
      for (i; i < len; i++) {
        runNode(nodes[i]);
      }
      
      executeComplete();
    },
    
    /**
     * Build a communcator function. If there are fetch rules, create a flow control
     * to handle communication (as opposed to the internal communicator).
     *
     * @private
     * @param  {TreeNode} node      The TreeNode you're building the communicator for.
     * @return {Function}           The built communicator method.
     */
    buildCommunicator: function(node) {

      var nodeData = node.data,
          self = this,
          parentData = node.getParent() ? node.getParent().data : null,
          fetchRules = this.env.rulesEngine.getFetchRules(nodeData.resolvedId),
          commFlow = new Flow(),

          commFlowResolver = {
            module: function() { return self.env.rulesEngine.resolveModule.apply(self.env.rulesEngine, arguments); },
            url: function() { return self.env.rulesEngine.resolveFile.apply(self.env.rulesEngine, arguments); }
          },

          commFlowCommunicator = {
            get: function() { return self.env.communicator.get.apply(self.env.communicator, arguments); }
          },

          addComm = function(fn) {
            commFlow.seq(function(next, error, contents) {
              function onData(data) {
                next(null, data);
              }
              function onError(err) {
                next(err, contents);
              }
              try {
                fn(onData, contents, commFlowResolver, commFlowCommunicator, {
                  moduleId: nodeData.originalId,
                  parentId: (parentData) ? parentData.originalId : '',
                  parentUrl: (parentData) ? parentData.resolvedUrl : ''
                });
              }
              catch(e) {
                onError(e);
              }
            });
          };
    
      // is this module already available? If so, don't redownload. This happens often when
      // there was an inline define() on the page
      if (this.env.executor.getModule(nodeData.resolvedId)) {
        return function(a, b, cb) {
          cb('');
        };
      }

      else if (this.env.executor.getModule(this.env.requireContext.qualifiedId(node))) {
        return function(a, b, cb) {
          cb('');
        };
      }

      else if (fetchRules.length > 0) {
        return function(name, path, cb) {
          var i = 0,
              len = fetchRules.length;
          commFlow.seq(function(next) {
            next(null, '');
          });
          for (i; i < len; i++) {
            addComm(fetchRules[i]);
          }
          commFlow.seq(function (next, error, contents) {
            // If AMD is enabled, and it has a new ID, then assign that
            cb(contents);
          });
        };
      }

      return proxy(this.env.communicator.get, this.env.communicator);
    },

    /**
     * Fetch dependencies from child nodes and kick off downloads.
     *
     * @private
     * @param  {TreeNode}   node    The children's parent node.
     * @param  {Function} callback  A method to call when the downloading is complete.
     */
    downloadDependencies: function(node, callback) {

      var requires = this.env.analyzer.extractRequires(node.data.file),
          children = requires.length,
          i = 0,
          len = children,
          child,
          runner,
    
          childDone = function() {
            children--;
            if (children === 0) {
              callback();
            }
          },
    
          childRunner = function(r) {
            nextTick(function() {
              r.download(childDone);
            });
          };

      if (!requires.length) {
        return callback();
      }

      for (i; i < len; i++) {
        child = new TreeNode();
        child.data.originalId = requires[i];
        node.addChild(child);
      
        if (this.env.executor.getModule(requires[i]) && this.env.executor.getModule(requires[i]).exec) {
          // we have it
          childDone();
        }
        else {
          // go get it
          runner = new this.env.TreeRunner(this.env, child);
          childRunner(runner);
        }
      }
    }
  };
});

  
  // initialize
  init('__INJECT__VERSION__');
})(this);