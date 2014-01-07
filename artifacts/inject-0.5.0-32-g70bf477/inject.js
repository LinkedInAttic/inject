/**
 * @license
 * Inject (c) 2011 LinkedIn [https://github.com/linkedin/inject] Apache Software License 2.0
 * lscache (c) 2011 Pamela Fox [https://github.com/pamelafox/lscache] Apache Software License 2.0
 * Link.js (c) 2012 Calyptus Life AB, Sweden [https://github.com/calyptus/link.js] Simplified BSD & MIT License
 * GoWithTheFlow.js (c) 2011 Jerome Etienne, [https://github.com/jeromeetienne/gowiththeflow.js] MIT License
 * easyXDM (c) 2011 2009-2011 Øyvind Sean Kinsey, oyvind@kinsey.no [https://github.com/oyvindkinsey/easyXDM] MIT License
 */
!(function(context, undefined){
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

/**
 * a test to determine if this is the IE engine (needed
 * for source in eval commands)
 * @constant
 */
var IS_IE = eval('/*@cc_on!@*/false');

// sniffs and assigns UA tests
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
 * AMD modules that are deferred have this set
 * as their "arg[0]" as a way to flag
 * @constant
 */
var AMD_DEFERRED = '###DEFERRED###';

/**
 * the namespace for inject() that is publicly reachable
 * @constant
 */
var NAMESPACE = 'Inject';

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
  'gi'                            // flags: global, case-insensitive
);

/**
 * Extract define() statements from within a larger string.
 * Used by analyzer to parse files.
 * @constant
 */
var DEFINE_REGEX = new RegExp(
  '(?:^|[\\s;,\\?\\}\\)\\(])' +   // begins with start of string, and any symbol a function call() can follow
  'define[\\s]*\\(' +             // the "define" keyword, followed by optional whitespace and its opening paren
  '.*?\\[' +                      // anything (don't care) until we hit the first [
  '(.*?)' +                       // our match (contents of the array)
  '\\]',                          // the closing bracket
  'gi'                            // flags: global, case-insensitive
);

/**
 * Extract terms from define statements.
 * Used by analyzer to parse files in conjunction with DEFINE_REGEX.
 * @constant
 */
var DEFINE_TERM_REGEX = new RegExp(
  '[\'"]' +                       // a quote
  '(.*?)' +                       // the term inside of quotes
  '[\'"]',                        // the closing quotes
  'gi'                            // flags: global, case-insensitive
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

;/*jshint unused:false */
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
      @see <a href="https://github.com/oyvindkinsey/easyXDM">easyXDM</a>
    @property {string|null} xd.relaySwf URL for easyXDM FlashTransport
      @see <a href="https://github.com/oyvindkinsey/easyXDM">easyXDM</a>
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
    relayFile: null,
    relaySwf: null
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
    Reference to easyXDM library, if loaded.
    @see <a href="http://www.easyxdm.net">easyXDM</a>
    @global
 */
var easyXdm = false;

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
    Returns object for doing async requests.
    @return {XMLHttpRequest|ActiveXObject}
    @function
    @global
 */
var getXhr = (function () {
  if (isHostMethod(window, 'XMLHttpRequest')) {
    return function () {
      return new XMLHttpRequest();
    };
  }
  else {
    var item = (function () {
      var list = ['Microsoft', 'Msxml2', 'Msxml3'], i = list.length;
      while (i--) {
        try {
          item = list[i] + '.XMLHTTP';
          var obj = new ActiveXObject(item);
          return item;
        }
        catch (e) {}
      }
    }());
    return function () {
      return new ActiveXObject(item);
    };
  }
}());

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
})();;/*jshint unused:false */
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
 * INTERNAL object, which contains methods reachable during the eval.
 * Markers in the file for dynamic content are identified with
 * __DOUBLE_UNDERSCORES__, while internal variables are marked with
 * __singleUnderscores
 * @file This file contains the commonJS header and footers
**/

/**
    CommonJS header with placeholders for Inject namespace, module ID,
    module URI, function ID and pointcut before advice.
    @type {string}
    @global
*/
var commonJSHeader = (['',
  '__INJECT_NS__.INTERNAL.execute.__FUNCTION_ID__ = function() {',
  '  with (window) {',
  '  __INJECT_NS__.INTERNAL.modules.__FUNCTION_ID__ = __INJECT_NS__.INTERNAL.createModule("__MODULE_ID__", "__MODULE_URI__");',
  '    __INJECT_NS__.INTERNAL.execs.__FUNCTION_ID__ = function() {',
  '      // id: __MODULE_ID__ uri: __MODULE_URI__',
  '      var module = __INJECT_NS__.INTERNAL.modules.__FUNCTION_ID__,',
  '          require = __INJECT_NS__.INTERNAL.createRequire(module.id, module.uri),',
  '          define = __INJECT_NS__.INTERNAL.createDefine(module.id, module.uri),',
  '          exports = module.exports;',                                       //NOTE: FOLLOWING TRY/CATCH MUST BE ON ONE LINE!
  '      try{module.undefined_function();}catch(e){module.__error_line = e;}' // NOTE: no lines (blank or otherwise) after this, it marks the start of file
  ]).join('\n');

/**
    CommonJS footer with placeholders for Inject namespace, exception, and
    pointcut after advice.
    @type {string}
    @global
*/
var commonJSFooter = (['',
  '    __INJECT_NS__.INTERNAL.modules.__FUNCTION_ID__ = module;',
  '    };',
  '    __INJECT_NS__.INTERNAL.defineExecutingModuleAs("__MODULE_ID__", "__MODULE_URI__");',
  '    try {',
  '      __INJECT_NS__.INTERNAL.execs.__FUNCTION_ID__.call(__INJECT_NS__.INTERNAL.modules.__FUNCTION_ID__);',
  '    }',
  '    catch (__EXCEPTION__) {',
  '      __INJECT_NS__.INTERNAL.modules.__FUNCTION_ID__.__error = __EXCEPTION__;',
  '    }',
  '    __INJECT_NS__.INTERNAL.undefineExecutingModule();',
  '    return __INJECT_NS__.INTERNAL.modules.__FUNCTION_ID__;',
  '  }',
  '};',
  '']).join('\n');
;//     Fiber.js 1.0.5
//     @author: Kirollos Risk
//
//     Copyright (c) 2012 LinkedIn.
//     All Rights Reserved. Apache Software License 2.0
//     http://www.apache.org/licenses/LICENSE-2.0

(function () {
  /*jshint bitwise: true, camelcase: false, curly: true, eqeqeq: true,
    forin: false, immed: true, indent: 2, latedef: true, newcap: false,
    noarg: true, noempty: false, nonew: true, plusplus: false,
    quotmark: single, regexp: false, undef: true, unused: true, strict: false,
    trailing: true, asi: false, boss: false, debug: false, eqnull: true,
    es5: false, esnext: false, evil: true, expr: false, funcscope: false,
    iterator: false, lastsemic: false, laxbreak: false, laxcomma: false,
    loopfunc: false, multistr: true, onecase: false, proto: false,
    regexdash: false, scripturl: false, smarttabs: false, shadow: true,
    sub: true, supernew: true, validthis: false */

  /*global exports, global, define, module */

  (function (root, factory) {
    if (typeof exports === 'object') {
      // Node. Does not work with strict CommonJS, but
      // only CommonJS-like environments that support module.exports,
      // like Node.
      module.exports = factory(this);
    } else if (typeof define === 'function' && define.amd) {
      // AMD. Register as an anonymous module.
      define(function () {
        return factory(root);
      });
    } else {
      // Browser globals (root is window)
      root.Fiber = factory(root);
    }
  }(this, function (global) {

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
    function copy(from, to) {
      var name;
      for (name in from) {
        if (from.hasOwnProperty(name)) {
          to[name] = from[name];
        }
      }
    }

    // The base `Fiber` implementation.
    function Fiber() {}

    // ###Extend
    //
    // Returns a subclass.
    Fiber.extend = function (fn) {
      // Keep a reference to the current prototye.
      var parent = this.prototype,

      // Invoke the function which will return an object literal used to
      // define the prototype. Additionally, pass in the parent prototype,
      // which will allow instances to use it.
      properties = fn(parent),

      // Stores the constructor's prototype.
      proto;

      // The constructor function for a subclass.
      function child() {
        if (!initializing) {
          // Custom initialization is done in the `init` method.
          this.init.apply(this, arguments);
          // Prevent subsequent calls to `init`. Note: although a `delete
          // this.init` would remove the `init` function from the instance, it
          // would still exist in its super class' prototype.  Therefore,
          // explicitly set `init` to `void 0` to obtain the `undefined`
          // primitive value (in case the global's `undefined` property has
          // been re-assigned).
          this.init = void 0;
        }
      }

      // Instantiate a base class (but only create the instance, without
      // running `init`). And, make every `constructor` instance an instance
      // of `this` and of `constructor`.
      initializing = true;
      proto = child.prototype = new this;
      initializing = false;

      // Add default `init` function, which a class may override; it should
      // call the super class' `init` function (if it exists);
      proto.init = function () {
        if (typeof parent.init === 'function') {
          parent.init.apply(this, arguments);
        }
      };

       // Copy the properties over onto the new prototype.
      copy(properties, proto);

      // Enforce the constructor to be what we expect.
      proto.constructor = child;

      // Keep a reference to the parent prototype.
      // (Note: currently used by decorators and mixins, so that the parent
      // can be inferred).
      child.__base__ = parent;

      // Make this class extendable, this can be overridden by providing a
      // custom extend method on the proto.
      child.extend = child.prototype.extend || Fiber.extend;


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
    Fiber.proxy = function (base, instance) {
      var name,
        iface = {},
        wrap;

      // If there's only 1 argument specified, then it is the instance,
      // thus infer `base` from its constructor.
      if (arguments.length === 1) {
        instance = base;
        base = instance.constructor.__base__;
      }

      // Returns a function which calls another function with `instance` as
      // the context.
      wrap = function (fn) {
        return function () {
          return base[fn].apply(instance, arguments);
        };
      };

      // For each function in `base`, create a wrapped version.
      for (name in base) {
        if (base.hasOwnProperty(name) && typeof base[name] === 'function') {
          iface[name] = wrap(name);
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
    // Note: when a decorator is executed, the argument passed in is the super
    // class' prototype, and the context (i.e. the `this` binding) is the
    // instance.
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
    Fiber.decorate = function (instance /*, decorator[s] */) {
      var i,
        // Get the base prototype.
        base = instance.constructor.__base__,
        // Get all the decorators in the arguments.
        decorators = ArrayProto.slice.call(arguments, 1),
        len = decorators.length;

      for (i = 0; i < len; i++) {
        copy(decorators[i].call(instance, base), instance);
      }
    };

    // ###Mixin
    //
    // Add functionality to a Fiber definition
    //
    // - `definition`: a Fiber class definition.
    // - `mixin[s]`: the argument list of mixins.
    //
    // Note: when a mixing is executed, the argument passed in is the super
    // class' prototype (i.e., the base)
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
    Fiber.mixin = function (definition /*, mixin[s] */) {
      var i,
        // Get the base prototype.
        base = definition.__base__,
        // Get all the mixins in the arguments.
        mixins = ArrayProto.slice.call(arguments, 1),
        len = mixins.length;

      for (i = 0; i < len; i++) {
        copy(mixins[i](base), definition.prototype);
      }
    };

    // ###noConflict
    //
    // Run Fiber.js in *noConflict* mode, returning the `fiber` variable to
    // its previous owner. Returns a reference to the Fiber object.
    Fiber.noConflict = function () {
      global.Fiber = previousFiber;
      return Fiber;
    };

    return Fiber;
  }));
} ());;/*jshint multistr:true */

// this file has been modified from its original source
// changed export to a local variable

/*
Link.js is dual-licensed under both the MIT and Simplified BSD license.


Simplified BSD License

Copyright (c) 2012 Calyptus Life AB, Sweden

The tokenizer is derived from http://code.google.com/p/jstokenizer/
Copyright (c) 2011 Ariya Hidayat <ariya.hidayat@gmail.com>

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met: 

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer. 
2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution. 

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.


MIT License

Copyright (c) 2012 Calyptus Life AB, Sweden

The tokenizer is derived from http://code.google.com/p/jstokenizer/
Copyright (c) 2011 Ariya Hidayat <ariya.hidayat@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/


var LinkJS = {};

// BEGIN LINKJS LIBRARY

// version: 0.15;

(function(){
"use strict";

// if (typeof exports !== 'undefined') exports.parse = parse;
LinkJS.parse = parse;

var hop = {}.hasOwnProperty;

// Conversion options

var defaultOptions = {

	// Define the output format. These values can be combined to create a multi-format file.
	cjs: true,      // If true, convert to a CommonJS compatible module,
	amd: false,     // If true, convert to an AMD compatible module.
	global: false,  // If true, export to the global object for script tag loading.

	// Define a synchronous function that determines a dependency's exported identifiers.
	// Modules that don't allow for static analysis may need to be executed to be resolved.
	// If not set, dynamic mode is used.
	resolve: null,

	// Enables enforcement of "use strict" mode. The compiled code will require ES5.
	// When this option is false, strict mode is not enforced on top level code.
	// Wrap your code in a strict function if you want to enforce it on newer engines
	// yet remain compatible with old.
	strict: false

};

// Boilerplate

var umd = {

	'':
		'$',

	'cjs':
		'$',

	'global':
		'(function(exports){\nfunction require(id){ return this; };\n$\n}.call(this, this));',

	'cjs,global':
		'(function(require, exports){\n$\n}' +
		'.call(this, typeof require === "undefined" ? function(){return this} : require, this));',

	'amd':
		'define(function(require, exports, module){\n$\n});',

	'cjs,amd':
		'(typeof define === "function" && define.amd ? define : ' +
		'function(factory){factory.call(exports, require, exports, module)}' +
		')(function(require, exports, module){\n$\n});',

	'amd,global':
		'(typeof define === "function" && define.amd ? define : ' +
		'function(factory){factory.call(this, function(){return this}, this)}' +
		')(function(require, exports, module){\n$\n});',

	'cjs,amd,global':
		'(typeof define === "function" && define.amd ? define : ' +
		'function(factory){var e = typeof exports == "undefined" ? this : exports;' +
		'factory.call(e, typeof require == "undefined" ? function(){return this} : require, e, typeof module == "undefined" ? null : module)}' +
		')(function(require, exports, module){\n$\n});'

};

// TODO: AMD modules should be destructured to CommonJS to be fully compatible.

var define = "\
var define = function(id, deps, factory){\
	if (typeof id !== 'string'){ factory = deps; deps = id; }\
	if (factory == null){ factory = deps; deps = ['require', 'exports', 'module']; }\
	function resolveList(deps){\
		var required = [];\
		for (var i = 0, l = deps.length; i < l; i++)\
			required.push(\
				(deps[i] === 'require') ? amdRequire :\
				(deps[i] === 'exports') ? exports :\
				(deps[i] === 'module') ? module :\
				require(deps[i])\
			);\
		return required;\
	}\
	function amdRequire(ids, success, failure){\
		if (typeof ids === 'string') return require(ids);\
		var resolved = resolveList(ids);\
		/*try { var resolved = resolveList(ids); }\
		catch (error) { if (failure) failure(error); return; }*/\
		if (success) success.apply(null, resolved);\
	}\
	amdRequire.toUrl = require.resolve;\
	if (typeof factory === 'function') factory = factory.apply(exports, resolveList(deps));\
	if (factory) module.exports = factory;\
};define.amd={};\
";

// Transpiler

function ModuleDefinition(source){
	this.id = null;
	this.source = source;

	this.requires = [];
	this.imports  = [];

	this.exportedVariables = [];
	this.exportedFunctions = [];
	this.declaredVariables = [];
	this.declaredFunctions = [];
	this.expectedVariables = [];

	this.lexicalExports = true; // TODO
	this.exportedProperties = []; // TODO

	this.strict = 0;
	this.lexicalScope = true;
	this.amd = false;

	this.tokens = [];
	this.lexicalEnvironment = {};
};

ModuleDefinition.prototype = {

	resolve: function(resolver){
		var input = this.source,
		    newLine = /\r\n/.test(input) ? '\r\n' : '\n',
		    output = [],
		    imports = this.imports,
		    lexicalEnvironment = this.lexicalEnvironment,
		    imported = {};

		// Write strict mode
		output.push(input.substr(0, this.strict));
		if (this.strict) output.push(newLine);

		// Resolve imported properties
		if (typeof resolver === 'function')
			for (var i = 0, l = imports.length; i < l; i++){
				var id = imports[i],
					name = '__MODULE' + i + '__',
					m = resolver(id);

				if (m && m.length)
					for (var j = 0, k = m.length; j < k; j++){
						var identifier = m[j];
						if (hop.call(imported, identifier) && imported[identifier].id !== id)
							error('importConflict', imported[identifier].id, id, identifier, this.id || '');
						else if (!lexicalEnvironment[identifier] || !hop.call(lexicalEnvironment, identifier))
							imported[identifier] = { id: id, name: name };
						else if ((lexicalEnvironment[identifier] & Exported) === Exported)
							error('exportConflict', id, identifier, this.id || '');
						else
							warn('shadowedImport', id, identifier, this.id || '');
					}

				// Import module
				output.push(
					i == 0 ? 'var ' : ', ',
					name, ' = require("', id, '")'
				);
			}
		if (imports.length) output.push(';', newLine);

		// Redeclare variables at the top
		for (var i = 0, l = this.declaredVariables.length; i < l; i++){
			output.push(i == 0 ? 'var ' : ', ');
			output.push(this.declaredVariables[i]);
		}
		if (l) output.push(';', newLine);

		// Export hoisted function declarations at the top
		for (var i = 0, l = this.exportedFunctions.length; i < l; i++){
			output.push('exports.', this.exportedFunctions[i], ' = ', this.exportedFunctions[i], '; ');
		}
		if (l) output.push(newLine);

		// Rewrite the source code
		var last = this.strict, tokens = this.tokens;
		for (var i = 0, l = tokens.length; i < l; i++){
			var token = tokens[i], type = token.type;
			output.push(input.substring(last, token.start));
			last = token.start;
			if (type === Identifier){
				// Rewrite imported and exported top level variables
				var identifier = token.value;
				if ((lexicalEnvironment[identifier] & Exported) === Exported)
					output.push('exports.');
				else if (hop.call(imported, identifier))
					output.push(imported[identifier].name + '.');

			} else if (type === RequireStatement){
				// Strip require statement
				last = token.end;

			} else if (type === ExportsStatement){
				// Strip exports label
				last = token.expressionStart;

			} else if (type === VariableDeclaration){
				// Strip variable declaration
				last = token.expressionStart;
			}
		}
		output.push(input.substring(last, input.length));

		return output.join('');
	},

	wrapStrict: function(){
		var output = [],
		    exports = this.exportedProperties,
		    imports = this.imports;

		for (var i = 0, l = exports.length; i < l; i++)
			output.push('exports.', exports[i], '=');
		if (l > 0) output.push('{}.undefined;');

		for (var i = 0, l = imports.length; i < l; i++)
			output.push('with(require("', imports[i], '"))\n');

		if (imports.length) output.push('(function(){');

		exports = this.exportedVariables.concat(this.exportedFunctions);
		if (exports.length){
			for (var i = 0, l = exports.length; i < l; i++){
				var e = exports[i], v = e == 'v' ? 'b' : 'v';
				output.push(
					i == 0 ? '({}.constructor.defineProperties(this, {' : ',',
					e, ':{get:function(){return ', e, '},set:function(', v, '){', e, '=', v,'},enumerable:true}'
				);
			}
			if (l) output.push('}));');
		}

		output.push(this.source);

		if (imports.length) output.push('}.call(this))');

		return output.join('');
	},

	wrap: function(){
		var output = [], exports, imports = this.imports;

		exports = this.exportedVariables.concat(this.exportedProperties);
		for (var i = 0, l = exports.length; i < l; i++)
			output.push('exports.', exports[i], '=');
		if (l > 0) output.push('{}.undefined;');

		for (var i = 0, l = imports.length; i < l; i++)
			output.push('with(require("', imports[i], '"))\n');

		output.push('with(exports)(function(){');

		exports = this.exportedFunctions;
		for (var i = 0, l = exports.length; i < l; i++)
			output.push('this.', exports[i], '=', exports[i], ';');

		output.push(
			'with(this){\n',
			this.source,
			'\n}'
		);

		output.push('}.call(exports));');

		return output.join('');
	},

	convert: function(options){
		if (!options) options = defaultOptions;
		var result;

		if (!this.imports.length && !this.exportedFunctions.length && !this.exportedVariables.length)
			result = this.source;
		else if (this.lexicalScope && options.resolve)
			result = this.resolve(options.resolve);
		else if (this.strict && options.strict)
			result = this.wrapStrict();
		else
			result = this.wrap();

		var boilerplates = [];
		if (options.cjs) boilerplates.push('cjs');
		if (options.amd) boilerplates.push('amd');
		if (options.global) boilerplates.push('global');
		
		if ((this.amd || this.lexicalEnvironment['define'] === Undeclared) && (!options.amd || boilerplates.length > 1))
			result = define + result;

		return umd[boilerplates].replace('$', result);
	}

};

// Error helpers

var errorMessages = {

	'importConflict': 
		'Import conflict: "$1" and "$2" both export "$3"\n' +
		'Resolve it by explicitly naming one of them: var $32 = require("$2").$3\n[$4]',

	'exportConflict': 
		'Export conflict: "$1" also contains the exported "$2"\n' +
		'Resolve it by explicitly naming one of them: var $22 = require("$1").$2\n[$3]',

	'shadowedImport':
		'Import shadowed: The variable $2 is declared by this module but it\'s also\n' +
		'imported through "$1". Only the locally declared variable will be used.\n[$3]',

	'invalidArgs':
		'Invalid arguments.',

	'nestedRequire':
		'The require statement can only be applied in the top scope. (Line $1)',

	'nestedExport':
		'The exports statement can only be applied in the top scope. (Line $1)',

	'unknownExport':
		'Unknown export statement. (Line $1)',

	'undeclaredExport':
		'Cannot export undeclared variable: $1'

};

function formatMessage(args){
	return errorMessages[args[0]]
	       .replace(/\$(\d)/g, function(s, i){ return args[i]; })
}

function warn(){
	console.warn(formatMessage(arguments));
};

function error(){
	throw new Error(formatMessage(arguments));
};

// Tokenizer

var source,
	index,
	lineNumber,
	length,
	previousToken;

var EOF = 2,
	Identifier = 3,
	Keyword = 4,
	Literal = 5,
	Punctuator = 7,
	StringLiteral = 8,

	VariableDeclaration = 10,
	FunctionDeclaration = 11,
	ExportsStatement = 12,
	RequireStatement = 13;

function createToken(type, value, start){
	return {
		type: type,
		value: value,
		lineNumber: lineNumber,
		start: start,
		end: index
	};
}

function isDecimalDigit(ch) {
	return '0123456789'.indexOf(ch) >= 0;
}

function couldBeRegExp(){
	// TODO: Proper regexp handling, when I find a case for it
	var token = previousToken;
	return typeof token === 'undefined' ||
		(token.type === Punctuator && '})]'.indexOf(token.value) == -1) ||
		(token.type === Keyword && isKeyword(token.value));
}

function isWhiteSpace(ch) {
	// TODO Unicode "space separator"
	return (ch === ' ') || (ch === '\u0009') || (ch === '\u000B') ||
		(ch === '\u000C') || (ch === '\u00A0') || (ch === '\uFEFF');
}

function isPunctuator(ch){
	return '=<>{}();:,.!?+-*%&|^/[]~'.indexOf(ch) >= 0;
}

function isLineTerminator(ch) {
	return (ch === '\n' || ch === '\r' || ch === '\u2028' || ch === '\u2029');
}

function isKeyword(id) {
	switch (id) {

	// Keywords.
	case 'break':
	case 'case':
	case 'catch':
	case 'continue':
	case 'debugger':
	case 'default':
	case 'delete':
	case 'do':
	case 'else':
	case 'finally':
	case 'for':
	case 'function':
	case 'if':
	case 'in':
	case 'instanceof':
	case 'new':
	case 'return':
	case 'switch':
	case 'this':
	case 'throw':
	case 'try':
	case 'typeof':
	case 'var':
	case 'void':
	case 'while':
	case 'with':
		return true;

	// Future reserved words.
	// 'const' is specialized as Keyword in V8.
	case 'const':
		return true;

	// strict mode
	case 'implements':
	case 'interface':
	case 'let':
	case 'package':
	case 'private':
	case 'protected':
	case 'public':
	case 'static':
	case 'yield':
		return true;
	}

	return false;
}

function nextChar() {
	var ch = '\x00',
		idx = index;
	if (idx < length) {
		ch = source[idx];
		index += 1;
	}
	return ch;
}

function skipComment() {
	var ch, blockComment, lineComment;

	blockComment = false;
	lineComment = false;

	while (index < length) {
		ch = source[index];

		if (lineComment) {
			nextChar();
			if (isLineTerminator(ch)) {
				lineComment = false;
				if (ch ===  '\r' && source[index] === '\n') {
					nextChar();
				}
				lineNumber += 1;
			}
		} else if (blockComment) {
			nextChar();
			if (ch === '*') {
				ch = source[index];
				if (ch === '/') {
					nextChar();
					blockComment = false;
				}
			} else if (isLineTerminator(ch)) {
				if (ch ===  '\r' && source[index] === '\n') {
					nextChar();
				}
				lineNumber += 1;
			}
		} else if (ch === '/') {
			ch = source[index + 1];
			if (ch === '/') {
				nextChar();
				nextChar();
				lineComment = true;
			} else if (ch === '*') {
				nextChar();
				nextChar();
				blockComment = true;
			} else {
				break;
			}
		} else if (isWhiteSpace(ch)) {
			nextChar();
		} else if (isLineTerminator(ch)) {
			nextChar();
			if (ch ===  '\r' && source[index] === '\n') {
				nextChar();
			}
			lineNumber += 1;
		} else {
			break;
		}
	}
}

function scanIdentifier() {
	var ch, start, id;
	ch = source[index];
	start = index;
	id = nextChar();
	while (index < length) {
		ch = source[index];
		if (isWhiteSpace(ch) || isLineTerminator(ch) || isPunctuator(ch) ||
			ch == '\'' || ch == '"')
			break;
		id += nextChar();
	}

	if (id.length === 1)
		return createToken(Identifier, id, start);

	if (isKeyword(id))
		return createToken(Keyword, id, start);

	if (id === 'null' || id === 'true' || id === 'false')
		return createToken(Literal, id, start);

	return createToken(Identifier, id, start);
}

function scanPunctuator() {
	var start = index,
		ch1 = source[index],
		ch2 = source[index + 1];

	if (ch1 === ch2 && ('+-<>&|'.indexOf(ch1) >= 0))
		return createToken(Punctuator, nextChar() + nextChar(), start);

	return createToken(Punctuator, nextChar(), start);
}

function scanNumericLiteral() {
	var number, ch;
	while (index < length) {
		ch = source[index];
		if ('0123456789abcdefABCDEF.xXeE'.indexOf(ch) < 0) {
			if (ch != '+' && ch != '-') break;
			ch = source[index - 1];
			if (ch != 'e' && ch != 'E') break;
		}
		nextChar();
	}
	return createToken(Literal);
}

function scanStringLiteral() {
	var str = '', quote, start, ch;

	quote = source[index];
	start = index;
	nextChar();

	while (index < length) {
		ch = nextChar();

		if (ch === quote) {
			break;
		} else if (ch === '\\') {
			ch = nextChar();
			if (!isLineTerminator(ch)) {
				str += '\\';
				str += ch;
			}
		} else {
			str += ch;
		}
	}

	return createToken(StringLiteral, str, start);
}

function scanRegExp() {
	nextChar();
	var start = index;
	while (index < length) {
		var ch = nextChar();
		if (ch === '\\')
			nextChar();
		if (ch === '/')
			break;
		if (ch === '[')
			while (index < length && nextChar() !== ']');
	}
	while (index < length && (/[a-z]/i).test(source[index]))
		nextChar();
	return createToken(Literal);
}

function advance() {
	var ch;

	skipComment();

	if (index >= length)
		return createToken(EOF);

	ch = source[index];

	if (ch === '/' && couldBeRegExp())
		return scanRegExp();

	if (isPunctuator(ch) && (ch != '.' || !isDecimalDigit(source[index+1])))
		return scanPunctuator();

	if (ch === '\'' || ch === '"')
		return scanStringLiteral();

	if (ch === '.' || isDecimalDigit(ch))
		return scanNumericLiteral();

	return scanIdentifier();
}

// Parser

var module,
	scope,
	globalScope,
	scopeAliases,
	scopeTokens,
	dependencies,
	buffer;

var Undeclared = 0,
	DeclaredVariable = 1,
	DeclaredFunction = 2 | DeclaredVariable,
	Exported = 4,
	ExportedVariable = DeclaredVariable | Exported,
	ExportedFunction = DeclaredFunction | Exported,
	ExportedProperty = 8 | Exported;

var Required = 1,
	Imported = 3;

function lex(){
	var token;

	if (buffer){
		token = buffer;
		buffer = null;
		return token;
	}
	buffer = null;
	return previousToken = advance();
}

function lookahead(){
	if (buffer !== null)
		return buffer;
	return buffer = previousToken = advance();
}

function expect(value){
	var token = lex();
	if (token.type !== Punctuator || token.value !== value) {
		throw new Error('Unexpected token: ' + token.value + ' at line ' + lineNumber);
	}
}

function expectKeyword(keyword){
	var token = lex();
	if (token.type !== Keyword || token.value !== keyword) {
		throw new Error('Unexpected token: ' + token.value);
	}
}

function match(value){
	var token = lookahead();
	return token.type === Punctuator && token.value === value;
}

function matchKeyword(keyword){
	var token = lookahead();
	return token.type === Keyword && token.value === keyword;
}

function matchBlockStart(){
	var token = lookahead();
	if (token.type == Keyword){
		if (token.value == 'case'){
			lex();
			lex();
			return true;
		}
		if (token.value == 'default'){
			lex();
			return true;
		}
		return token.value == 'do' || token.value == 'else' ||
			   token.value == 'finally' || token.value == 'try';
	}
	return false;
}

function matchParenthesisBlockStart(){
	var token = lookahead();
	if (token.type == Keyword)
		return token.value == 'if' || token.value == 'for' ||
			   token.value == 'catch' || token.value == 'with' ||
			   token.value == 'switch' || token.value == 'while';
	return false;
}

function matchASI(){
	// TODO Proper ASI in all cases
	var token = lookahead();
	return token.type !== Punctuator &&
		   (token.type !== Keyword || (token.value != 'in' && token.value != 'instanceof'));
}

function scanObjectInitializer(){
	expect('{');
	while (!match('}')){
		var token = lex();
		if (token.type == Identifier && (token.value == 'get' || token.value == 'set') && !match(':'))
			lex();
		expect(':');
		scanExpression();
		if (match('}')) break;
		expect(',');
	}
	expect('}');
}

function scanArrayInitializer(){
	expect('[');
	while (!match(']')){
		scanExpression();
		if (match(']')) break;
		expect(',');
	}
	expect(']');
}

function scanParenthesis(){
	expect('(');
	if (matchKeyword('var'))
		scanVariableDeclarationList(Undeclared, DeclaredVariable);
	else
		scanExpression();
	 while(match(',') || match(';')){
		lex();
		scanExpression();
	};
	expect(')');
}

function scanRequireExpression(){
	expect('(');
	if (lookahead().type == StringLiteral){
		var identifier = lex().value;
		if (match(')')){
			dependencies[identifier] |= Required;
			lex();
			return;
		}
	}
	scanExpression();
	while(match(',')){
		lex();
		if (match(')')) break;
		scanExpression();
	}
	expect(')');
}

function scanCallExpression(identifier){
	if (identifier == 'define') return scanDefineStatement();
	if (identifier == 'require') return scanRequireExpression();
	if (identifier == 'eval') module.lexicalScope = false;
	scanExpression();
}

function scanIdentifierExpression(token){
	var identifier = token.value;
	if (!(identifier in scope)) scope[identifier] = Undeclared;

	scopeTokens.push(token);

	if (identifier in scopeAliases){
		identifier = scopeAliases[identifier];
		if (globalScope[identifier]) return;
	} else {
		if (scope[identifier]) return;
	}
	if (match('(')) return scanCallExpression(identifier);
	if (identifier != 'exports') return;
	if (match('.')){
		lex();
		globalScope[lex().value] |= ExportedProperty;
	} else if (match('[')){
		lex();
		if (lookahead().type === StringLiteral){
			var value = lex().value;
			if (match(']')) globalScope[value] |= ExportedProperty;
		}
		scanExpression();
		expect(']');
	}
}

function scanExpression(){
	var token = lookahead();
	while (token.type != EOF && !match('}') && !match(')') && !match(']') && !match(',') && !match(';')){

		if (token.type == Identifier){
			lex();
			scanIdentifierExpression(token);
			if (matchASI()) break;
		}
		else if (token.type == StringLiteral || token.type == Literal){
			lex();
			if (matchASI()) break;
		}
		else if (matchKeyword('function')){
			scanFunctionExpression();
			if (matchASI()) break;
		}
		else if (match('{')){
			scanObjectInitializer();
			if (matchASI()) break;
		}
		else if (match('[')){
			scanArrayInitializer();
			if (matchASI()) break;

		} else if (match('(')){
			scanParenthesis();
			if (match('{')){
				scanBlock();
				return;
			}
			if (matchASI()) break;
		
		} else if (match('++') || match('--')){
			lex();
			var previous = lineNumber;
			if (matchASI() && previous !== lineNumber) break;

		} else if (match('.')){
			lex();
			token = lookahead();
			if (token.type == Identifier){
				lex();
				if (matchASI()) break;
			}
		}

		else
			lex();

		token = lookahead();
	}
}

function scanVariableDeclarationList(exported, declared){
	if (declared){
		var declarationToken = {
			type: VariableDeclaration,
			start: lex().start,
			expressionStart: lookahead().start,
			end: 0
		};
		if (scope === globalScope)
			scopeTokens.push(declarationToken);
	} 

	var token = lex();
	while(token.type !== EOF){
		var identifier = token.value;
		scope[identifier] |= declared;
		scope[identifier] |= exported;

		scopeTokens.push(token);

		if (match('=') || matchKeyword('in')) scanExpression();
		if (!match(',')) break;
		lex();
		token = lex();
	}

	if (declared) declarationToken.end = lookahead().start;
}

function scanCatchStatement(){
	expectKeyword('catch');
	// TODO: Variables declared belong to the function scope,
	// but the caught variable is unique to the catch scope.
	scanFunction();
}

function scanArguments(aliases){
	var token, i = 0;
	expect('(');
	if (!match(')')){
		while ((token = lex()).type != EOF){
			if (aliases != null && i < aliases.length){
				scopeAliases[token.value] = aliases[i++];
			}
			scope[token.value] |= DeclaredVariable;
			if (match(')')){
				break;
			}
			expect(',');
		}
	}
	expect(')');
}

function scanFunction(aliases, identifier){
	var scopeChain = function(){};
	scopeChain.prototype = scope;
	scope = new scopeChain();
	scope.arguments = DeclaredVariable;
	if (identifier) scope[identifier] = DeclaredFunction;

	if (aliases){
		var scopeAliasesChain = function(){};
		scopeAliasesChain.prototype = scopeAliases;
		scopeAliases = new scopeAliasesChain();
	}

	var parentScopeTokens = scopeTokens;
	scopeTokens = [];
	scanArguments(aliases);
	scanBlock();

	for (var i = 0, l = scopeTokens.length; i < l; i++){
		var identifier = scopeTokens[i].value;
		if (!hop.call(scope, identifier) || scope[identifier] === Undeclared){
			parentScopeTokens.push(scopeTokens[i]);
			scopeChain.prototype[identifier] |= Undeclared;
		}
	}

	scope = scopeChain.prototype;
	scopeTokens = parentScopeTokens;
	if (aliases) scopeAliases = scopeAliasesChain.prototype;
}

function scanFunctionDeclaration(exported){
	var start = lookahead().start;
	expectKeyword('function');
	var identifier = lex().value;
	scope[identifier] |= DeclaredFunction;
	scope[identifier] |= exported;
	var declarationToken = createToken(FunctionDeclaration, null, start);
	if (scope === globalScope) scopeTokens.push(declarationToken);
	scanFunction(null, identifier);
	declarationToken.end = lookahead().start;
}

function scanFunctionExpression(aliases){
	expectKeyword('function');
	if (lookahead().type === Identifier)
		scanFunction(aliases, lex().value);
	else
		scanFunction(aliases);
}

function scanBlock(){
	expect('{');
	scanStatements();
	expect('}');
}

function scanDefineStatement(){
	var id = null, deps = [];
	expect('(');
	module.amd = true;
	if (lookahead().type === StringLiteral){
		id = lex().value;
		if (match(',')) lex();
		if (matchKeyword('function')){
			scanFunctionExpression(['require', 'exports', 'module']);
			if (match(')')){
				lex();
				module.id = id;
				return;
			}
		}
		if (match(')')){ lex(); return; }
	}
	if (match('[')){
		lex();
		while (lookahead().type === StringLiteral){
			deps.push(lex().value);
			if (match(',')) lex();
		}
		if (match(']')){
			lex();
			if (match(',')){
				lex();
				if (matchKeyword('function')){
					scanFunctionExpression(deps);
					if (match(')')){
						module.id = id;
						for (var i = 0, l = deps.length; i < l; i++)
							if (deps[i] !== 'require' &&
							    deps[i] !== 'exports' &&
							    deps[i] !== 'module')
							    dependencies[deps[i]] |= Required;
					}
				} else {
					scanExpression();
				}
			}
		}
	}
	if (matchKeyword('function')){
		scanFunctionExpression(['require', 'exports', 'module']);
	} else if (!match(')')){
		scanExpression();
	}
	while(match(',')){
		lex();
		if (match(')')) break;
		scanExpression();
	}
	expect(')');
}

function scanRequireStatement(){
	if (scope !== globalScope){
		warn('nestedRequire', lookahead().lineNumber);
		return;
	}
	var token = lex();
	if (token.type === StringLiteral)
	while (token.type !== EOF){
		dependencies[token.value] |= Imported;
		if (match(','))
			lex();
		if (lookahead().type !== StringLiteral)
			break;
		token = lex();
	}
}

function scanExportsStatement(){
	if (scope !== globalScope){
		warn('nestedExport', lookahead().lineNumber);
		return;
	}
	if (matchKeyword('var'))
		scanVariableDeclarationList(Exported, DeclaredVariable);
	else if (matchKeyword('function'))
		scanFunctionDeclaration(Exported);
	else if (lookahead().type === Identifier)
		scanVariableDeclarationList(Exported, Undeclared);
	else
		warn('unknownExport', lookahead().lineNumber);
}

function scanStatement(){
	var token = lookahead();
	if (token.type === Identifier){
		lex();
		var identifier = token.value;
		if (match(':')){
			lex();
			var declarationToken = {
				type: 0,
				start: token.start,
				expressionStart: lookahead().start,
				end: 0
			};
			if (identifier === 'require'){
				if (scope === globalScope) scopeTokens.push(declarationToken);
				declarationToken.type = RequireStatement;
				scanRequireStatement();
			}
			if (identifier === 'exports'){
				if (scope === globalScope) scopeTokens.push(declarationToken);
				declarationToken.type = ExportsStatement;
				scanExportsStatement();
			}
			declarationToken.end = lookahead().start;
			if (match('{'))
				scanBlock();
		} else {
			scanIdentifierExpression(token);
		}
	}

	else if (matchKeyword('var'))
		scanVariableDeclarationList(Undeclared, DeclaredVariable);

	else if (matchKeyword('function'))
		scanFunctionDeclaration();

	else if (matchKeyword('catch'))
		scanCatchStatement();

	else if (matchBlockStart()){
		lex();
		if (match('{')) scanBlock();
	}

	else if (matchParenthesisBlockStart()){
		if (matchKeyword('with'))
			module.lexicalScope = false;
		lex();
		scanParenthesis();
		if (match('{')) scanBlock();
	}

	else if (match(',') || match(';'))
		lex();

	else
		scanExpression();	
}

function scanStatements(){
	var token = lookahead();
	while (token.type !== EOF && !match('}')){
		scanStatement();
		token = lookahead();
	}
}

function scanProgram(){
	var token = lookahead();
	if (token.type === StringLiteral && token.value === 'use strict'){
		lex();
		if (match(';')) token = lex();
		module.strict = token.end;
	}
	scanStatements();
}

function mapDependencies(dependency){
	var type = dependencies[dependency];
	if (type === Required){
		module.requires.push(dependency);
	} else if (type === Imported){
		module.requires.push(dependency);
		module.imports.push(dependency);
	}
}

function mapScope(identifier){
	var type = globalScope[identifier];
	if (type === Exported){
		warn('undeclaredExport', identifier);
		module.expectedVariables.push(identifier);
	}
	if ((type & ExportedFunction) === ExportedFunction)
		module.exportedFunctions.push(identifier);
	else if ((type & ExportedVariable) === ExportedVariable)
		module.exportedVariables.push(identifier);
	else if (type === ExportedProperty)
		module.exportedProperties.push(identifier);
	else if (type === DeclaredFunction)
		module.declaredFunctions.push(identifier);
	else if (type === DeclaredVariable)
		module.declaredVariables.push(identifier);
	else if (type === Undeclared)
		module.expectedVariables.push(identifier);
}

var enumFailures = ['constructor', 'hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable', 'toLocaleString', 'toString', 'valueOf'];
for (var i = 0; i < enumFailures.length; i++){
	var testObj = {};
	testObj[enumFailures[i]] = 1;
	for (var key in testObj)
		enumFailures.splice(i--, 1);
}

function parse(sourceCode){
	source = String(sourceCode);

	var m = module = new ModuleDefinition(sourceCode);

	// Reset
	index = 0;
	lineNumber = (source.length > 0) ? 1 : 0;
	length = source.length;
	scope = globalScope = m.lexicalEnvironment;
	scopeAliases = {};
	scopeTokens = m.tokens;
	dependencies = {};
	previousToken = buffer = null;

	// IE fix
	if (length > 0 && typeof source[0] === 'undefined'){
		source = [];
		for (var i = 0; i < length; i++)
			source[i] = sourceCode.charAt(i);
	}

	// Scan
	scanProgram();

	// Convert maps to arrays

	for (var key in globalScope) mapScope(key);

	for (var dependency in dependencies) mapDependencies(dependency);

	for (var i = 0, l = enumFailures.length; i < l; i++){
		mapScope(enumFailures[i]);
		mapDependencies(enumFailures[i]);
	}

	// Clean up
	module = globalScope = scope = scopeAliases = dependencies = buffer = source = null;

	return m;
}

}());;/*
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
};;/*
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

var LOCAL_EASY_XDM = true;
;/**
 * easyXDM
 * http://easyxdm.net/
 * Copyright(c) 2009-2011, Øyvind Sean Kinsey, oyvind@kinsey.no.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
(function(N,d,p,K,k,H){var b=this;var n=Math.floor(Math.random()*10000);var q=Function.prototype;var Q=/^((http.?:)\/\/([^:\/\s]+)(:\d+)*)/;var R=/[\-\w]+\/\.\.\//;var F=/([^:])\/\//g;var I="";var o={};var M=N.easyXDM;var U="easyXDM_";var E;var y=false;var i;var h;function C(X,Z){var Y=typeof X[Z];return Y=="function"||(!!(Y=="object"&&X[Z]))||Y=="unknown"}function u(X,Y){return !!(typeof(X[Y])=="object"&&X[Y])}function r(X){return Object.prototype.toString.call(X)==="[object Array]"}function c(){var Z="Shockwave Flash",ad="application/x-shockwave-flash";if(!t(navigator.plugins)&&typeof navigator.plugins[Z]=="object"){var ab=navigator.plugins[Z].description;if(ab&&!t(navigator.mimeTypes)&&navigator.mimeTypes[ad]&&navigator.mimeTypes[ad].enabledPlugin){i=ab.match(/\d+/g)}}if(!i){var Y;try{Y=new ActiveXObject("ShockwaveFlash.ShockwaveFlash");i=Array.prototype.slice.call(Y.GetVariable("$version").match(/(\d+),(\d+),(\d+),(\d+)/),1);Y=null}catch(ac){}}if(!i){return false}var X=parseInt(i[0],10),aa=parseInt(i[1],10);h=X>9&&aa>0;return true}var v,x;if(C(N,"addEventListener")){v=function(Z,X,Y){Z.addEventListener(X,Y,false)};x=function(Z,X,Y){Z.removeEventListener(X,Y,false)}}else{if(C(N,"attachEvent")){v=function(X,Z,Y){X.attachEvent("on"+Z,Y)};x=function(X,Z,Y){X.detachEvent("on"+Z,Y)}}else{throw new Error("Browser not supported")}}var W=false,J=[],L;if("readyState" in d){L=d.readyState;W=L=="complete"||(~navigator.userAgent.indexOf("AppleWebKit/")&&(L=="loaded"||L=="interactive"))}else{W=!!d.body}function s(){if(W){return}W=true;for(var X=0;X<J.length;X++){J[X]()}J.length=0}if(!W){if(C(N,"addEventListener")){v(d,"DOMContentLoaded",s)}else{v(d,"readystatechange",function(){if(d.readyState=="complete"){s()}});if(d.documentElement.doScroll&&N===top){var g=function(){if(W){return}try{d.documentElement.doScroll("left")}catch(X){K(g,1);return}s()};g()}}v(N,"load",s)}function G(Y,X){if(W){Y.call(X);return}J.push(function(){Y.call(X)})}function m(){var Z=parent;if(I!==""){for(var X=0,Y=I.split(".");X<Y.length;X++){Z=Z[Y[X]]}}return Z.easyXDM}function e(X){N.easyXDM=M;I=X;if(I){U="easyXDM_"+I.replace(".","_")+"_"}return o}function z(X){return X.match(Q)[3]}function f(X){return X.match(Q)[4]||""}function j(Z){var X=Z.toLowerCase().match(Q);var aa=X[2],ab=X[3],Y=X[4]||"";if((aa=="http:"&&Y==":80")||(aa=="https:"&&Y==":443")){Y=""}return aa+"//"+ab+Y}function B(X){X=X.replace(F,"$1/");if(!X.match(/^(http||https):\/\//)){var Y=(X.substring(0,1)==="/")?"":p.pathname;if(Y.substring(Y.length-1)!=="/"){Y=Y.substring(0,Y.lastIndexOf("/")+1)}X=p.protocol+"//"+p.host+Y+X}while(R.test(X)){X=X.replace(R,"")}return X}function P(X,aa){var ac="",Z=X.indexOf("#");if(Z!==-1){ac=X.substring(Z);X=X.substring(0,Z)}var ab=[];for(var Y in aa){if(aa.hasOwnProperty(Y)){ab.push(Y+"="+H(aa[Y]))}}return X+(y?"#":(X.indexOf("?")==-1?"?":"&"))+ab.join("&")+ac}var S=(function(X){X=X.substring(1).split("&");var Z={},aa,Y=X.length;while(Y--){aa=X[Y].split("=");Z[aa[0]]=k(aa[1])}return Z}(/xdm_e=/.test(p.search)?p.search:p.hash));function t(X){return typeof X==="undefined"}var O=function(){var Y={};var Z={a:[1,2,3]},X='{"a":[1,2,3]}';if(typeof JSON!="undefined"&&typeof JSON.stringify==="function"&&JSON.stringify(Z).replace((/\s/g),"")===X){return JSON}if(Object.toJSON){if(Object.toJSON(Z).replace((/\s/g),"")===X){Y.stringify=Object.toJSON}}if(typeof String.prototype.evalJSON==="function"){Z=X.evalJSON();if(Z.a&&Z.a.length===3&&Z.a[2]===3){Y.parse=function(aa){return aa.evalJSON()}}}if(Y.stringify&&Y.parse){O=function(){return Y};return Y}return null};function T(X,Y,Z){var ab;for(var aa in Y){if(Y.hasOwnProperty(aa)){if(aa in X){ab=Y[aa];if(typeof ab==="object"){T(X[aa],ab,Z)}else{if(!Z){X[aa]=Y[aa]}}}else{X[aa]=Y[aa]}}}return X}function a(){var Y=d.body.appendChild(d.createElement("form")),X=Y.appendChild(d.createElement("input"));X.name=U+"TEST"+n;E=X!==Y.elements[X.name];d.body.removeChild(Y)}function A(Y){if(t(E)){a()}var ac;if(E){ac=d.createElement('<iframe name="'+Y.props.name+'"/>')}else{ac=d.createElement("IFRAME");ac.name=Y.props.name}ac.id=ac.name=Y.props.name;delete Y.props.name;if(typeof Y.container=="string"){Y.container=d.getElementById(Y.container)}if(!Y.container){T(ac.style,{position:"absolute",top:"-2000px",left:"0px"});Y.container=d.body}var ab=Y.props.src;Y.props.src="javascript:false";T(ac,Y.props);ac.border=ac.frameBorder=0;ac.allowTransparency=true;Y.container.appendChild(ac);if(Y.onLoad){v(ac,"load",Y.onLoad)}if(Y.usePost){var aa=Y.container.appendChild(d.createElement("form")),X;aa.target=ac.name;aa.action=ab;aa.method="POST";if(typeof(Y.usePost)==="object"){for(var Z in Y.usePost){if(Y.usePost.hasOwnProperty(Z)){if(E){X=d.createElement('<input name="'+Z+'"/>')}else{X=d.createElement("INPUT");X.name=Z}X.value=Y.usePost[Z];aa.appendChild(X)}}}aa.submit();aa.parentNode.removeChild(aa)}else{ac.src=ab}Y.props.src=ab;return ac}function V(aa,Z){if(typeof aa=="string"){aa=[aa]}var Y,X=aa.length;while(X--){Y=aa[X];Y=new RegExp(Y.substr(0,1)=="^"?Y:("^"+Y.replace(/(\*)/g,".$1").replace(/\?/g,".")+"$"));if(Y.test(Z)){return true}}return false}function l(Z){var ae=Z.protocol,Y;Z.isHost=Z.isHost||t(S.xdm_p);y=Z.hash||false;if(!Z.props){Z.props={}}if(!Z.isHost){Z.channel=S.xdm_c.replace(/["'<>\\]/g,"");Z.secret=S.xdm_s;Z.remote=S.xdm_e.replace(/["'<>\\]/g,"");ae=S.xdm_p;if(Z.acl&&!V(Z.acl,Z.remote)){throw new Error("Access denied for "+Z.remote)}}else{Z.remote=B(Z.remote);Z.channel=Z.channel||"default"+n++;Z.secret=Math.random().toString(16).substring(2);if(t(ae)){if(j(p.href)==j(Z.remote)){ae="4"}else{if(C(N,"postMessage")||C(d,"postMessage")){ae="1"}else{if(Z.swf&&C(N,"ActiveXObject")&&c()){ae="6"}else{if(navigator.product==="Gecko"&&"frameElement" in N&&navigator.userAgent.indexOf("WebKit")==-1){ae="5"}else{if(Z.remoteHelper){ae="2"}else{ae="0"}}}}}}}Z.protocol=ae;switch(ae){case"0":T(Z,{interval:100,delay:2000,useResize:true,useParent:false,usePolling:false},true);if(Z.isHost){if(!Z.local){var ac=p.protocol+"//"+p.host,X=d.body.getElementsByTagName("img"),ad;var aa=X.length;while(aa--){ad=X[aa];if(ad.src.substring(0,ac.length)===ac){Z.local=ad.src;break}}if(!Z.local){Z.local=N}}var ab={xdm_c:Z.channel,xdm_p:0};if(Z.local===N){Z.usePolling=true;Z.useParent=true;Z.local=p.protocol+"//"+p.host+p.pathname+p.search;ab.xdm_e=Z.local;ab.xdm_pa=1}else{ab.xdm_e=B(Z.local)}if(Z.container){Z.useResize=false;ab.xdm_po=1}Z.remote=P(Z.remote,ab)}else{T(Z,{channel:S.xdm_c,remote:S.xdm_e,useParent:!t(S.xdm_pa),usePolling:!t(S.xdm_po),useResize:Z.useParent?false:Z.useResize})}Y=[new o.stack.HashTransport(Z),new o.stack.ReliableBehavior({}),new o.stack.QueueBehavior({encode:true,maxLength:4000-Z.remote.length}),new o.stack.VerifyBehavior({initiate:Z.isHost})];break;case"1":Y=[new o.stack.PostMessageTransport(Z)];break;case"2":Z.remoteHelper=B(Z.remoteHelper);Y=[new o.stack.NameTransport(Z),new o.stack.QueueBehavior(),new o.stack.VerifyBehavior({initiate:Z.isHost})];break;case"3":Y=[new o.stack.NixTransport(Z)];break;case"4":Y=[new o.stack.SameOriginTransport(Z)];break;case"5":Y=[new o.stack.FrameElementTransport(Z)];break;case"6":if(!i){c()}Y=[new o.stack.FlashTransport(Z)];break}Y.push(new o.stack.QueueBehavior({lazy:Z.lazy,remove:true}));return Y}function D(aa){var ab,Z={incoming:function(ad,ac){this.up.incoming(ad,ac)},outgoing:function(ac,ad){this.down.outgoing(ac,ad)},callback:function(ac){this.up.callback(ac)},init:function(){this.down.init()},destroy:function(){this.down.destroy()}};for(var Y=0,X=aa.length;Y<X;Y++){ab=aa[Y];T(ab,Z,true);if(Y!==0){ab.down=aa[Y-1]}if(Y!==X-1){ab.up=aa[Y+1]}}return ab}function w(X){X.up.down=X.down;X.down.up=X.up;X.up=X.down=null}T(o,{version:"2.4.17.1",query:S,stack:{},apply:T,getJSONObject:O,whenReady:G,noConflict:e});o.DomHelper={on:v,un:x,requiresJSON:function(X){if(!u(N,"JSON")){d.write('<script type="text/javascript" src="'+X+'"><\/script>')}}};(function(){var X={};o.Fn={set:function(Y,Z){X[Y]=Z},get:function(Z,Y){var aa=X[Z];if(Y){delete X[Z]}return aa}}}());o.Socket=function(Y){var X=D(l(Y).concat([{incoming:function(ab,aa){Y.onMessage(ab,aa)},callback:function(aa){if(Y.onReady){Y.onReady(aa)}}}])),Z=j(Y.remote);this.origin=j(Y.remote);this.destroy=function(){X.destroy()};this.postMessage=function(aa){X.outgoing(aa,Z)};X.init()};o.Rpc=function(Z,Y){if(Y.local){for(var ab in Y.local){if(Y.local.hasOwnProperty(ab)){var aa=Y.local[ab];if(typeof aa==="function"){Y.local[ab]={method:aa}}}}}var X=D(l(Z).concat([new o.stack.RpcBehavior(this,Y),{callback:function(ac){if(Z.onReady){Z.onReady(ac)}}}]));this.origin=j(Z.remote);this.destroy=function(){X.destroy()};X.init()};o.stack.SameOriginTransport=function(Y){var Z,ab,aa,X;return(Z={outgoing:function(ad,ae,ac){aa(ad);if(ac){ac()}},destroy:function(){if(ab){ab.parentNode.removeChild(ab);ab=null}},onDOMReady:function(){X=j(Y.remote);if(Y.isHost){T(Y.props,{src:P(Y.remote,{xdm_e:p.protocol+"//"+p.host+p.pathname,xdm_c:Y.channel,xdm_p:4}),name:U+Y.channel+"_provider"});ab=A(Y);o.Fn.set(Y.channel,function(ac){aa=ac;K(function(){Z.up.callback(true)},0);return function(ad){Z.up.incoming(ad,X)}})}else{aa=m().Fn.get(Y.channel,true)(function(ac){Z.up.incoming(ac,X)});K(function(){Z.up.callback(true)},0)}},init:function(){G(Z.onDOMReady,Z)}})};o.stack.FlashTransport=function(aa){var ac,X,ab,ad,Y,ae;function af(ah,ag){K(function(){ac.up.incoming(ah,ad)},0)}function Z(ah){var ag=aa.swf+"?host="+aa.isHost;var aj="easyXDM_swf_"+Math.floor(Math.random()*10000);o.Fn.set("flash_loaded"+ah.replace(/[\-.]/g,"_"),function(){o.stack.FlashTransport[ah].swf=Y=ae.firstChild;var ak=o.stack.FlashTransport[ah].queue;for(var al=0;al<ak.length;al++){ak[al]()}ak.length=0});if(aa.swfContainer){ae=(typeof aa.swfContainer=="string")?d.getElementById(aa.swfContainer):aa.swfContainer}else{ae=d.createElement("div");T(ae.style,h&&aa.swfNoThrottle?{height:"20px",width:"20px",position:"fixed",right:0,top:0}:{height:"1px",width:"1px",position:"absolute",overflow:"hidden",right:0,top:0});d.body.appendChild(ae)}var ai="callback=flash_loaded"+ah.replace(/[\-.]/g,"_")+"&proto="+b.location.protocol+"&domain="+z(b.location.href)+"&port="+f(b.location.href)+"&ns="+I;ae.innerHTML="<object height='20' width='20' type='application/x-shockwave-flash' id='"+aj+"' data='"+ag+"'><param name='allowScriptAccess' value='always'></param><param name='wmode' value='transparent'><param name='movie' value='"+ag+"'></param><param name='flashvars' value='"+ai+"'></param><embed type='application/x-shockwave-flash' FlashVars='"+ai+"' allowScriptAccess='always' wmode='transparent' src='"+ag+"' height='1' width='1'></embed></object>"}return(ac={outgoing:function(ah,ai,ag){Y.postMessage(aa.channel,ah.toString());if(ag){ag()}},destroy:function(){try{Y.destroyChannel(aa.channel)}catch(ag){}Y=null;if(X){X.parentNode.removeChild(X);X=null}},onDOMReady:function(){ad=aa.remote;o.Fn.set("flash_"+aa.channel+"_init",function(){K(function(){ac.up.callback(true)})});o.Fn.set("flash_"+aa.channel+"_onMessage",af);aa.swf=B(aa.swf);var ah=z(aa.swf);var ag=function(){o.stack.FlashTransport[ah].init=true;Y=o.stack.FlashTransport[ah].swf;Y.createChannel(aa.channel,aa.secret,j(aa.remote),aa.isHost);if(aa.isHost){if(h&&aa.swfNoThrottle){T(aa.props,{position:"fixed",right:0,top:0,height:"20px",width:"20px"})}T(aa.props,{src:P(aa.remote,{xdm_e:j(p.href),xdm_c:aa.channel,xdm_p:6,xdm_s:aa.secret}),name:U+aa.channel+"_provider"});X=A(aa)}};if(o.stack.FlashTransport[ah]&&o.stack.FlashTransport[ah].init){ag()}else{if(!o.stack.FlashTransport[ah]){o.stack.FlashTransport[ah]={queue:[ag]};Z(ah)}else{o.stack.FlashTransport[ah].queue.push(ag)}}},init:function(){G(ac.onDOMReady,ac)}})};o.stack.PostMessageTransport=function(aa){var ac,ad,Y,Z;function X(ae){if(ae.origin){return j(ae.origin)}if(ae.uri){return j(ae.uri)}if(ae.domain){return p.protocol+"//"+ae.domain}throw"Unable to retrieve the origin of the event"}function ab(af){var ae=X(af);if(ae==Z&&af.data.substring(0,aa.channel.length+1)==aa.channel+" "){ac.up.incoming(af.data.substring(aa.channel.length+1),ae)}}return(ac={outgoing:function(af,ag,ae){Y.postMessage(aa.channel+" "+af,ag||Z);if(ae){ae()}},destroy:function(){x(N,"message",ab);if(ad){Y=null;ad.parentNode.removeChild(ad);ad=null}},onDOMReady:function(){Z=j(aa.remote);if(aa.isHost){var ae=function(af){if(af.data==aa.channel+"-ready"){Y=("postMessage" in ad.contentWindow)?ad.contentWindow:ad.contentWindow.document;x(N,"message",ae);v(N,"message",ab);K(function(){ac.up.callback(true)},0)}};v(N,"message",ae);T(aa.props,{src:P(aa.remote,{xdm_e:j(p.href),xdm_c:aa.channel,xdm_p:1}),name:U+aa.channel+"_provider"});ad=A(aa)}else{v(N,"message",ab);Y=("postMessage" in N.parent)?N.parent:N.parent.document;Y.postMessage(aa.channel+"-ready",Z);K(function(){ac.up.callback(true)},0)}},init:function(){G(ac.onDOMReady,ac)}})};o.stack.FrameElementTransport=function(Y){var Z,ab,aa,X;return(Z={outgoing:function(ad,ae,ac){aa.call(this,ad);if(ac){ac()}},destroy:function(){if(ab){ab.parentNode.removeChild(ab);ab=null}},onDOMReady:function(){X=j(Y.remote);if(Y.isHost){T(Y.props,{src:P(Y.remote,{xdm_e:j(p.href),xdm_c:Y.channel,xdm_p:5}),name:U+Y.channel+"_provider"});ab=A(Y);ab.fn=function(ac){delete ab.fn;aa=ac;K(function(){Z.up.callback(true)},0);return function(ad){Z.up.incoming(ad,X)}}}else{if(d.referrer&&j(d.referrer)!=S.xdm_e){N.top.location=S.xdm_e}aa=N.frameElement.fn(function(ac){Z.up.incoming(ac,X)});Z.up.callback(true)}},init:function(){G(Z.onDOMReady,Z)}})};o.stack.NameTransport=function(ab){var ac;var ae,ai,aa,ag,ah,Y,X;function af(al){var ak=ab.remoteHelper+(ae?"#_3":"#_2")+ab.channel;ai.contentWindow.sendMessage(al,ak)}function ad(){if(ae){if(++ag===2||!ae){ac.up.callback(true)}}else{af("ready");ac.up.callback(true)}}function aj(ak){ac.up.incoming(ak,Y)}function Z(){if(ah){K(function(){ah(true)},0)}}return(ac={outgoing:function(al,am,ak){ah=ak;af(al)},destroy:function(){ai.parentNode.removeChild(ai);ai=null;if(ae){aa.parentNode.removeChild(aa);aa=null}},onDOMReady:function(){ae=ab.isHost;ag=0;Y=j(ab.remote);ab.local=B(ab.local);if(ae){o.Fn.set(ab.channel,function(al){if(ae&&al==="ready"){o.Fn.set(ab.channel,aj);ad()}});X=P(ab.remote,{xdm_e:ab.local,xdm_c:ab.channel,xdm_p:2});T(ab.props,{src:X+"#"+ab.channel,name:U+ab.channel+"_provider"});aa=A(ab)}else{ab.remoteHelper=ab.remote;o.Fn.set(ab.channel,aj)}var ak=function(){var al=ai||this;x(al,"load",ak);o.Fn.set(ab.channel+"_load",Z);(function am(){if(typeof al.contentWindow.sendMessage=="function"){ad()}else{K(am,50)}}())};ai=A({props:{src:ab.local+"#_4"+ab.channel},onLoad:ak})},init:function(){G(ac.onDOMReady,ac)}})};o.stack.HashTransport=function(Z){var ac;var ah=this,af,aa,X,ad,am,ab,al;var ag,Y;function ak(ao){if(!al){return}var an=Z.remote+"#"+(am++)+"_"+ao;((af||!ag)?al.contentWindow:al).location=an}function ae(an){ad=an;ac.up.incoming(ad.substring(ad.indexOf("_")+1),Y)}function aj(){if(!ab){return}var an=ab.location.href,ap="",ao=an.indexOf("#");if(ao!=-1){ap=an.substring(ao)}if(ap&&ap!=ad){ae(ap)}}function ai(){aa=setInterval(aj,X)}return(ac={outgoing:function(an,ao){ak(an)},destroy:function(){N.clearInterval(aa);if(af||!ag){al.parentNode.removeChild(al)}al=null},onDOMReady:function(){af=Z.isHost;X=Z.interval;ad="#"+Z.channel;am=0;ag=Z.useParent;Y=j(Z.remote);if(af){T(Z.props,{src:Z.remote,name:U+Z.channel+"_provider"});if(ag){Z.onLoad=function(){ab=N;ai();ac.up.callback(true)}}else{var ap=0,an=Z.delay/50;(function ao(){if(++ap>an){throw new Error("Unable to reference listenerwindow")}try{ab=al.contentWindow.frames[U+Z.channel+"_consumer"]}catch(aq){}if(ab){ai();ac.up.callback(true)}else{K(ao,50)}}())}al=A(Z)}else{ab=N;ai();if(ag){al=parent;ac.up.callback(true)}else{T(Z,{props:{src:Z.remote+"#"+Z.channel+new Date(),name:U+Z.channel+"_consumer"},onLoad:function(){ac.up.callback(true)}});al=A(Z)}}},init:function(){G(ac.onDOMReady,ac)}})};o.stack.ReliableBehavior=function(Y){var aa,ac;var ab=0,X=0,Z="";return(aa={incoming:function(af,ad){var ae=af.indexOf("_"),ag=af.substring(0,ae).split(",");af=af.substring(ae+1);if(ag[0]==ab){Z="";if(ac){ac(true);ac=null}}if(af.length>0){aa.down.outgoing(ag[1]+","+ab+"_"+Z,ad);if(X!=ag[1]){X=ag[1];aa.up.incoming(af,ad)}}},outgoing:function(af,ad,ae){Z=af;ac=ae;aa.down.outgoing(X+","+(++ab)+"_"+af,ad)}})};o.stack.QueueBehavior=function(Z){var ac,ad=[],ag=true,aa="",af,X=0,Y=false,ab=false;function ae(){if(Z.remove&&ad.length===0){w(ac);return}if(ag||ad.length===0||af){return}ag=true;var ah=ad.shift();ac.down.outgoing(ah.data,ah.origin,function(ai){ag=false;if(ah.callback){K(function(){ah.callback(ai)},0)}ae()})}return(ac={init:function(){if(t(Z)){Z={}}if(Z.maxLength){X=Z.maxLength;ab=true}if(Z.lazy){Y=true}else{ac.down.init()}},callback:function(ai){ag=false;var ah=ac.up;ae();ah.callback(ai)},incoming:function(ak,ai){if(ab){var aj=ak.indexOf("_"),ah=parseInt(ak.substring(0,aj),10);aa+=ak.substring(aj+1);if(ah===0){if(Z.encode){aa=k(aa)}ac.up.incoming(aa,ai);aa=""}}else{ac.up.incoming(ak,ai)}},outgoing:function(al,ai,ak){if(Z.encode){al=H(al)}var ah=[],aj;if(ab){while(al.length!==0){aj=al.substring(0,X);al=al.substring(aj.length);ah.push(aj)}while((aj=ah.shift())){ad.push({data:ah.length+"_"+aj,origin:ai,callback:ah.length===0?ak:null})}}else{ad.push({data:al,origin:ai,callback:ak})}if(Y){ac.down.init()}else{ae()}},destroy:function(){af=true;ac.down.destroy()}})};o.stack.VerifyBehavior=function(ab){var ac,aa,Y,Z=false;function X(){aa=Math.random().toString(16).substring(2);ac.down.outgoing(aa)}return(ac={incoming:function(af,ad){var ae=af.indexOf("_");if(ae===-1){if(af===aa){ac.up.callback(true)}else{if(!Y){Y=af;if(!ab.initiate){X()}ac.down.outgoing(af)}}}else{if(af.substring(0,ae)===Y){ac.up.incoming(af.substring(ae+1),ad)}}},outgoing:function(af,ad,ae){ac.down.outgoing(aa+"_"+af,ad,ae)},callback:function(ad){if(ab.initiate){X()}}})};o.stack.RpcBehavior=function(ad,Y){var aa,af=Y.serializer||O();var ae=0,ac={};function X(ag){ag.jsonrpc="2.0";aa.down.outgoing(af.stringify(ag))}function ab(ag,ai){var ah=Array.prototype.slice;return function(){var aj=arguments.length,al,ak={method:ai};if(aj>0&&typeof arguments[aj-1]==="function"){if(aj>1&&typeof arguments[aj-2]==="function"){al={success:arguments[aj-2],error:arguments[aj-1]};ak.params=ah.call(arguments,0,aj-2)}else{al={success:arguments[aj-1]};ak.params=ah.call(arguments,0,aj-1)}ac[""+(++ae)]=al;ak.id=ae}else{ak.params=ah.call(arguments,0)}if(ag.namedParams&&ak.params.length===1){ak.params=ak.params[0]}X(ak)}}function Z(an,am,ai,al){if(!ai){if(am){X({id:am,error:{code:-32601,message:"Procedure not found."}})}return}var ak,ah;if(am){ak=function(ao){ak=q;X({id:am,result:ao})};ah=function(ao,ap){ah=q;var aq={id:am,error:{code:-32099,message:ao}};if(ap){aq.error.data=ap}X(aq)}}else{ak=ah=q}if(!r(al)){al=[al]}try{var ag=ai.method.apply(ai.scope,al.concat([ak,ah]));if(!t(ag)){ak(ag)}}catch(aj){ah(aj.message)}}return(aa={incoming:function(ah,ag){var ai=af.parse(ah);if(ai.method){if(Y.handle){Y.handle(ai,X)}else{Z(ai.method,ai.id,Y.local[ai.method],ai.params)}}else{var aj=ac[ai.id];if(ai.error){if(aj.error){aj.error(ai.error)}}else{if(aj.success){aj.success(ai.result)}}delete ac[ai.id]}},init:function(){if(Y.remote){for(var ag in Y.remote){if(Y.remote.hasOwnProperty(ag)){ad[ag]=ab(Y.remote[ag],ag)}}}aa.down.init()},destroy:function(){for(var ag in Y.remote){if(Y.remote.hasOwnProperty(ag)&&ad.hasOwnProperty(ag)){delete ad[ag]}}aa.down.destroy()}})};b.easyXDM=o})(window,document,location,window.setTimeout,decodeURIComponent,encodeURIComponent);;/**
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
flush:function(){if(k())for(var a=localStorage.length-1;0<=a;--a){var b=localStorage.key(a);0===b.indexOf(e+c)&&localStorage.removeItem(b)}},setBucket:function(a){c=a},resetBucket:function(){c=""}}}();;/*
 TraceKit - Cross brower stack traces - github.com/occ/TraceKit
 MIT license
*/

;(function(window, undefined) {


var TraceKit = {};
var _oldTraceKit = window.TraceKit;

// global reference to slice
var _slice = [].slice;
var UNKNOWN_FUNCTION = '?';


/**
 * _has, a better form of hasOwnProperty
 * Example: _has(MainHostObject, property) === true/false
 *
 * @param {Object} host object to check property
 * @param {string} key to check
 */
function _has(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
}

function _isUndefined(what) {
    return typeof what === 'undefined';
}

/**
 * TraceKit.noConflict: Export TraceKit out to another variable
 * Example: var TK = TraceKit.noConflict()
 */
TraceKit.noConflict = function noConflict() {
    window.TraceKit = _oldTraceKit;
    return TraceKit;
};

/**
 * TraceKit.wrap: Wrap any function in a TraceKit reporter
 * Example: func = TraceKit.wrap(func);
 *
 * @param {Function} func Function to be wrapped
 * @return {Function} The wrapped func
 */
TraceKit.wrap = function traceKitWrapper(func) {
    function wrapped() {
        try {
            return func.apply(this, arguments);
        } catch (e) {
            TraceKit.report(e);
            throw e;
        }
    }
    return wrapped;
};

/**
 * TraceKit.report: cross-browser processing of unhandled exceptions
 *
 * Syntax:
 *   TraceKit.report.subscribe(function(stackInfo) { ... })
 *   TraceKit.report.unsubscribe(function(stackInfo) { ... })
 *   TraceKit.report(exception)
 *   try { ...code... } catch(ex) { TraceKit.report(ex); }
 *
 * Supports:
 *   - Firefox: full stack trace with line numbers, plus column number
 *              on top frame; column number is not guaranteed
 *   - Opera:   full stack trace with line and column numbers
 *   - Chrome:  full stack trace with line and column numbers
 *   - Safari:  line and column number for the top frame only; some frames
 *              may be missing, and column number is not guaranteed
 *   - IE:      line and column number for the top frame only; some frames
 *              may be missing, and column number is not guaranteed
 *
 * In theory, TraceKit should work on all of the following versions:
 *   - IE5.5+ (only 8.0 tested)
 *   - Firefox 0.9+ (only 3.5+ tested)
 *   - Opera 7+ (only 10.50 tested; versions 9 and earlier may require
 *     Exceptions Have Stacktrace to be enabled in opera:config)
 *   - Safari 3+ (only 4+ tested)
 *   - Chrome 1+ (only 5+ tested)
 *   - Konqueror 3.5+ (untested)
 *
 * Requires TraceKit.computeStackTrace.
 *
 * Tries to catch all unhandled exceptions and report them to the
 * subscribed handlers. Please note that TraceKit.report will rethrow the
 * exception. This is REQUIRED in order to get a useful stack trace in IE.
 * If the exception does not reach the top of the browser, you will only
 * get a stack trace from the point where TraceKit.report was called.
 *
 * Handlers receive a stackInfo object as described in the
 * TraceKit.computeStackTrace docs.
 */
TraceKit.report = (function reportModuleWrapper() {
    var handlers = [],
        lastException = null,
        lastExceptionStack = null;

    /**
     * Add a crash handler.
     * @param {Function} handler
     */
    function subscribe(handler) {
        installGlobalHandler();
        handlers.push(handler);
    }

    /**
     * Remove a crash handler.
     * @param {Function} handler
     */
    function unsubscribe(handler) {
        for (var i = handlers.length - 1; i >= 0; --i) {
            if (handlers[i] === handler) {
                handlers.splice(i, 1);
            }
        }
    }

    /**
     * Dispatch stack information to all handlers.
     * @param {Object.<string, *>} stack
     */
    function notifyHandlers(stack, windowError) {
        var exception = null;
        if (windowError && !TraceKit.collectWindowErrors) {
          return;
        }
        for (var i in handlers) {
            if (_has(handlers, i)) {
                try {
                    handlers[i].apply(null, [stack].concat(_slice.call(arguments, 2)));
                } catch (inner) {
                    exception = inner;
                }
            }
        }

        if (exception) {
            throw exception;
        }
    }

    var _oldOnerrorHandler, _onErrorHandlerInstalled;

    /**
     * Ensures all global unhandled exceptions are recorded.
     * Supported by Gecko and IE.
     * @param {string} message Error message.
     * @param {string} url URL of script that generated the exception.
     * @param {(number|string)} lineNo The line number at which the error
     * occurred.
     */
    function traceKitWindowOnError(message, url, lineNo) {
        var stack = null;

        if (lastExceptionStack) {
            TraceKit.computeStackTrace.augmentStackTraceWithInitialElement(lastExceptionStack, url, lineNo, message);
            stack = lastExceptionStack;
            lastExceptionStack = null;
            lastException = null;
        } else {
            var location = {
                'url': url,
                'line': lineNo
            };
            location.func = TraceKit.computeStackTrace.guessFunctionName(location.url, location.line);
            location.context = TraceKit.computeStackTrace.gatherContext(location.url, location.line);
            stack = {
                'mode': 'onerror',
                'message': message,
                'url': document.location.href,
                'stack': [location],
                'useragent': navigator.userAgent
            };
        }

        notifyHandlers(stack, 'from window.onerror');

        if (_oldOnerrorHandler) {
            return _oldOnerrorHandler.apply(this, arguments);
        }

        return false;
    }

    function installGlobalHandler ()
    {
        if (_onErrorHandlerInstalled === true) {
            return;
        }
        _oldOnerrorHandler = window.onerror;
        window.onerror = traceKitWindowOnError;
        _onErrorHandlerInstalled = true;
    }

    /**
     * Reports an unhandled Error to TraceKit.
     * @param {Error} ex
     */
    function report(ex) {
        var args = _slice.call(arguments, 1);
        if (lastExceptionStack) {
            if (lastException === ex) {
                return; // already caught by an inner catch block, ignore
            } else {
                var s = lastExceptionStack;
                lastExceptionStack = null;
                lastException = null;
                notifyHandlers.apply(null, [s, null].concat(args));
            }
        }

        var stack = TraceKit.computeStackTrace(ex);
        lastExceptionStack = stack;
        lastException = ex;

        // If the stack trace is incomplete, wait for 2 seconds for
        // slow slow IE to see if onerror occurs or not before reporting
        // this exception; otherwise, we will end up with an incomplete
        // stack trace
        window.setTimeout(function () {
            if (lastException === ex) {
                lastExceptionStack = null;
                lastException = null;
                notifyHandlers.apply(null, [stack, null].concat(args));
            }
        }, (stack.incomplete ? 2000 : 0));

        throw ex; // re-throw to propagate to the top level (and cause window.onerror)
    }

    report.subscribe = subscribe;
    report.unsubscribe = unsubscribe;
    return report;
}());

/**
 * TraceKit.computeStackTrace: cross-browser stack traces in JavaScript
 *
 * Syntax:
 *   s = TraceKit.computeStackTrace.ofCaller([depth])
 *   s = TraceKit.computeStackTrace(exception) // consider using TraceKit.report instead (see below)
 * Returns:
 *   s.name              - exception name
 *   s.message           - exception message
 *   s.stack[i].url      - JavaScript or HTML file URL
 *   s.stack[i].func     - function name, or empty for anonymous functions (if guessing did not work)
 *   s.stack[i].args     - arguments passed to the function, if known
 *   s.stack[i].line     - line number, if known
 *   s.stack[i].column   - column number, if known
 *   s.stack[i].context  - an array of source code lines; the middle element corresponds to the correct line#
 *   s.mode              - 'stack', 'stacktrace', 'multiline', 'callers', 'onerror', or 'failed' -- method used to collect the stack trace
 *
 * Supports:
 *   - Firefox:  full stack trace with line numbers and unreliable column
 *               number on top frame
 *   - Opera 10: full stack trace with line and column numbers
 *   - Opera 9-: full stack trace with line numbers
 *   - Chrome:   full stack trace with line and column numbers
 *   - Safari:   line and column number for the topmost stacktrace element
 *               only
 *   - IE:       no line numbers whatsoever
 *
 * Tries to guess names of anonymous functions by looking for assignments
 * in the source code. In IE and Safari, we have to guess source file names
 * by searching for function bodies inside all page scripts. This will not
 * work for scripts that are loaded cross-domain.
 * Here be dragons: some function names may be guessed incorrectly, and
 * duplicate functions may be mismatched.
 *
 * TraceKit.computeStackTrace should only be used for tracing purposes.
 * Logging of unhandled exceptions should be done with TraceKit.report,
 * which builds on top of TraceKit.computeStackTrace and provides better
 * IE support by utilizing the window.onerror event to retrieve information
 * about the top of the stack.
 *
 * Note: In IE and Safari, no stack trace is recorded on the Error object,
 * so computeStackTrace instead walks its *own* chain of callers.
 * This means that:
 *  * in Safari, some methods may be missing from the stack trace;
 *  * in IE, the topmost function in the stack trace will always be the
 *    caller of computeStackTrace.
 *
 * This is okay for tracing (because you are likely to be calling
 * computeStackTrace from the function you want to be the topmost element
 * of the stack trace anyway), but not okay for logging unhandled
 * exceptions (because your catch block will likely be far away from the
 * inner function that actually caused the exception).
 *
 * Tracing example:
 *     function trace(message) {
 *         var stackInfo = TraceKit.computeStackTrace.ofCaller();
 *         var data = message + "\n";
 *         for(var i in stackInfo.stack) {
 *             var item = stackInfo.stack[i];
 *             data += (item.func || '[anonymous]') + "() in " + item.url + ":" + (item.line || '0') + "\n";
 *         }
 *         if (window.console)
 *             console.info(data);
 *         else
 *             alert(data);
 *     }
 */
TraceKit.computeStackTrace = (function computeStackTraceWrapper() {
    var debug = false,
        sourceCache = {};

    /**
     * Attempts to retrieve source code via XMLHttpRequest, which is used
     * to look up anonymous function names.
     * @param {string} url URL of source code.
     * @return {string} Source contents.
     */
    function loadSource(url) {
        if (!TraceKit.remoteFetching) { //Only attempt request if remoteFetching is on.
            return '';
        }
        try {
            function getXHR() {
                try {
                    return new window.XMLHttpRequest();
                } catch (e) {
                    // explicitly bubble up the exception if not found
                    return new window.ActiveXObject('Microsoft.XMLHTTP');
                }
            }

            var request = getXHR();
            request.open('GET', url, false);
            request.send('');
            return request.responseText;
        } catch (e) {
            return '';
        }
    }

    /**
     * Retrieves source code from the source code cache.
     * @param {string} url URL of source code.
     * @return {Array.<string>} Source contents.
     */
    function getSource(url) {
        if (!_has(sourceCache, url)) {
            // URL needs to be able to fetched within the acceptable domain.  Otherwise,
            // cross-domain errors will be triggered.
            var source = '';
            if (url.indexOf(document.domain) !== -1) {
                source = loadSource(url);
            }
            sourceCache[url] = source ? source.split('\n') : [];
        }

        return sourceCache[url];
    }

    /**
     * Tries to use an externally loaded copy of source code to determine
     * the name of a function by looking at the name of the variable it was
     * assigned to, if any.
     * @param {string} url URL of source code.
     * @param {(string|number)} lineNo Line number in source code.
     * @return {string} The function name, if discoverable.
     */
    function guessFunctionName(url, lineNo) {
        var reFunctionArgNames = /function ([^(]*)\(([^)]*)\)/,
            reGuessFunction = /['"]?([0-9A-Za-z$_]+)['"]?\s*[:=]\s*(function|eval|new Function)/,
            line = '',
            maxLines = 10,
            source = getSource(url),
            m;

        if (!source.length) {
            return UNKNOWN_FUNCTION;
        }

        // Walk backwards from the first line in the function until we find the line which
        // matches the pattern above, which is the function definition
        for (var i = 0; i < maxLines; ++i) {
            line = source[lineNo - i] + line;

            if (!_isUndefined(line)) {
                if ((m = reGuessFunction.exec(line))) {
                    return m[1];
                } else if ((m = reFunctionArgNames.exec(line))) {
                    return m[1];
                }
            }
        }

        return UNKNOWN_FUNCTION;
    }

    /**
     * Retrieves the surrounding lines from where an exception occurred.
     * @param {string} url URL of source code.
     * @param {(string|number)} line Line number in source code to centre
     * around for context.
     * @return {?Array.<string>} Lines of source code.
     */
    function gatherContext(url, line) {
        var source = getSource(url);

        if (!source.length) {
            return null;
        }

        var context = [],
            // linesBefore & linesAfter are inclusive with the offending line.
            // if linesOfContext is even, there will be one extra line
            //   *before* the offending line.
            linesBefore = Math.floor(TraceKit.linesOfContext / 2),
            // Add one extra line if linesOfContext is odd
            linesAfter = linesBefore + (TraceKit.linesOfContext % 2),
            start = Math.max(0, line - linesBefore - 1),
            end = Math.min(source.length, line + linesAfter - 1);

        line -= 1; // convert to 0-based index

        for (var i = start; i < end; ++i) {
            if (!_isUndefined(source[i])) {
                context.push(source[i]);
            }
        }

        return context.length > 0 ? context : null;
    }

    /**
     * Escapes special characters, except for whitespace, in a string to be
     * used inside a regular expression as a string literal.
     * @param {string} text The string.
     * @return {string} The escaped string literal.
     */
    function escapeRegExp(text) {
        return text.replace(/[\-\[\]{}()*+?.,\\\^$|#]/g, '\\$&');
    }

    /**
     * Escapes special characters in a string to be used inside a regular
     * expression as a string literal. Also ensures that HTML entities will
     * be matched the same as their literal friends.
     * @param {string} body The string.
     * @return {string} The escaped string.
     */
    function escapeCodeAsRegExpForMatchingInsideHTML(body) {
        return escapeRegExp(body).replace('<', '(?:<|&lt;)').replace('>', '(?:>|&gt;)').replace('&', '(?:&|&amp;)').replace('"', '(?:"|&quot;)').replace(/\s+/g, '\\s+');
    }

    /**
     * Determines where a code fragment occurs in the source code.
     * @param {RegExp} re The function definition.
     * @param {Array.<string>} urls A list of URLs to search.
     * @return {?Object.<string, (string|number)>} An object containing
     * the url, line, and column number of the defined function.
     */
    function findSourceInUrls(re, urls) {
        var source, m;
        for (var i = 0, j = urls.length; i < j; ++i) {
            // console.log('searching', urls[i]);
            if ((source = getSource(urls[i])).length) {
                source = source.join('\n');
                if ((m = re.exec(source))) {
                    // console.log('Found function in ' + urls[i]);

                    return {
                        'url': urls[i],
                        'line': source.substring(0, m.index).split('\n').length,
                        'column': m.index - source.lastIndexOf('\n', m.index) - 1
                    };
                }
            }
        }

        // console.log('no match');

        return null;
    }

    /**
     * Determines at which column a code fragment occurs on a line of the
     * source code.
     * @param {string} fragment The code fragment.
     * @param {string} url The URL to search.
     * @param {(string|number)} line The line number to examine.
     * @return {?number} The column number.
     */
    function findSourceInLine(fragment, url, line) {
        var source = getSource(url),
            re = new RegExp('\\b' + escapeRegExp(fragment) + '\\b'),
            m;

        line -= 1;

        if (source && source.length > line && (m = re.exec(source[line]))) {
            return m.index;
        }

        return null;
    }

    /**
     * Determines where a function was defined within the source code.
     * @param {(Function|string)} func A function reference or serialized
     * function definition.
     * @return {?Object.<string, (string|number)>} An object containing
     * the url, line, and column number of the defined function.
     */
    function findSourceByFunctionBody(func) {
        var urls = [window.location.href],
            scripts = document.getElementsByTagName('script'),
            body,
            code = '' + func,
            codeRE = /^function(?:\s+([\w$]+))?\s*\(([\w\s,]*)\)\s*\{\s*(\S[\s\S]*\S)\s*\}\s*$/,
            eventRE = /^function on([\w$]+)\s*\(event\)\s*\{\s*(\S[\s\S]*\S)\s*\}\s*$/,
            re,
            parts,
            result;

        for (var i = 0; i < scripts.length; ++i) {
            var script = scripts[i];
            if (script.src) {
                urls.push(script.src);
            }
        }

        if (!(parts = codeRE.exec(code))) {
            re = new RegExp(escapeRegExp(code).replace(/\s+/g, '\\s+'));
        }

        // not sure if this is really necessary, but I don’t have a test
        // corpus large enough to confirm that and it was in the original.
        else {
            var name = parts[1] ? '\\s+' + parts[1] : '',
                args = parts[2].split(',').join('\\s*,\\s*');

            body = escapeRegExp(parts[3]).replace(/;$/, ';?'); // semicolon is inserted if the function ends with a comment.replace(/\s+/g, '\\s+');
            re = new RegExp('function' + name + '\\s*\\(\\s*' + args + '\\s*\\)\\s*{\\s*' + body + '\\s*}');
        }

        // look for a normal function definition
        if ((result = findSourceInUrls(re, urls))) {
            return result;
        }

        // look for an old-school event handler function
        if ((parts = eventRE.exec(code))) {
            var event = parts[1];
            body = escapeCodeAsRegExpForMatchingInsideHTML(parts[2]);

            // look for a function defined in HTML as an onXXX handler
            re = new RegExp('on' + event + '=[\\\'"]\\s*' + body + '\\s*[\\\'"]', 'i');

            if ((result = findSourceInUrls(re, urls[0]))) {
                return result;
            }

            // look for ???
            re = new RegExp(body);

            if ((result = findSourceInUrls(re, urls))) {
                return result;
            }
        }

        return null;
    }

    // Contents of Exception in various browsers.
    //
    // SAFARI:
    // ex.message = Can't find variable: qq
    // ex.line = 59
    // ex.sourceId = 580238192
    // ex.sourceURL = http://...
    // ex.expressionBeginOffset = 96
    // ex.expressionCaretOffset = 98
    // ex.expressionEndOffset = 98
    // ex.name = ReferenceError
    //
    // FIREFOX:
    // ex.message = qq is not defined
    // ex.fileName = http://...
    // ex.lineNumber = 59
    // ex.stack = ...stack trace... (see the example below)
    // ex.name = ReferenceError
    //
    // CHROME:
    // ex.message = qq is not defined
    // ex.name = ReferenceError
    // ex.type = not_defined
    // ex.arguments = ['aa']
    // ex.stack = ...stack trace...
    //
    // INTERNET EXPLORER:
    // ex.message = ...
    // ex.name = ReferenceError
    //
    // OPERA:
    // ex.message = ...message... (see the example below)
    // ex.name = ReferenceError
    // ex.opera#sourceloc = 11  (pretty much useless, duplicates the info in ex.message)
    // ex.stacktrace = n/a; see 'opera:config#UserPrefs|Exceptions Have Stacktrace'

    /**
     * Computes stack trace information from the stack property.
     * Chrome and Gecko use this property.
     * @param {Error} ex
     * @return {?Object.<string, *>} Stack trace information.
     */
    function computeStackTraceFromStackProp(ex) {
        if (!ex.stack) {
            return null;
        }

        var chrome = /^\s*at (?:((?:\[object object\])?\S+(?: \[as \S+\])?) )?\(?((?:file|http|https):.*?):(\d+)(?::(\d+))?\)?\s*$/i,
            gecko = /^\s*(\S*)(?:\((.*?)\))?@((?:file|http|https).*?):(\d+)(?::(\d+))?\s*$/i,
            lines = ex.stack.split('\n'),
            stack = [],
            parts,
            element,
            reference = /^(.*) is undefined$/.exec(ex.message);

        for (var i = 0, j = lines.length; i < j; ++i) {
            if ((parts = gecko.exec(lines[i]))) {
                element = {
                    'url': parts[3],
                    'func': parts[1] || UNKNOWN_FUNCTION,
                    'args': parts[2] ? parts[2].split(',') : '',
                    'line': +parts[4],
                    'column': parts[5] ? +parts[5] : null
                };
            } else if ((parts = chrome.exec(lines[i]))) {
                element = {
                    'url': parts[2],
                    'func': parts[1] || UNKNOWN_FUNCTION,
                    'line': +parts[3],
                    'column': parts[4] ? +parts[4] : null
                };
            } else {
                continue;
            }

            if (!element.func && element.line) {
                element.func = guessFunctionName(element.url, element.line);
            }

            if (element.line) {
                element.context = gatherContext(element.url, element.line);
            }

            stack.push(element);
        }

        if (stack[0] && stack[0].line && !stack[0].column && reference) {
            stack[0].column = findSourceInLine(reference[1], stack[0].url, stack[0].line);
        }

        if (!stack.length) {
            return null;
        }

        return {
            'mode': 'stack',
            'name': ex.name,
            'message': ex.message,
            'url': document.location.href,
            'stack': stack,
            'useragent': navigator.userAgent
        };
    }

    /**
     * Computes stack trace information from the stacktrace property.
     * Opera 10 uses this property.
     * @param {Error} ex
     * @return {?Object.<string, *>} Stack trace information.
     */
    function computeStackTraceFromStacktraceProp(ex) {
        // Access and store the stacktrace property before doing ANYTHING
        // else to it because Opera is not very good at providing it
        // reliably in other circumstances.
        var stacktrace = ex.stacktrace;

        var testRE = / line (\d+), column (\d+) in (?:<anonymous function: ([^>]+)>|([^\)]+))\((.*)\) in (.*):\s*$/i,
            lines = stacktrace.split('\n'),
            stack = [],
            parts;

        for (var i = 0, j = lines.length; i < j; i += 2) {
            if ((parts = testRE.exec(lines[i]))) {
                var element = {
                    'line': +parts[1],
                    'column': +parts[2],
                    'func': parts[3] || parts[4],
                    'args': parts[5] ? parts[5].split(',') : [],
                    'url': parts[6]
                };

                if (!element.func && element.line) {
                    element.func = guessFunctionName(element.url, element.line);
                }
                if (element.line) {
                    try {
                        element.context = gatherContext(element.url, element.line);
                    } catch (exc) {}
                }

                if (!element.context) {
                    element.context = [lines[i + 1]];
                }

                stack.push(element);
            }
        }

        if (!stack.length) {
            return null;
        }

        return {
            'mode': 'stacktrace',
            'name': ex.name,
            'message': ex.message,
            'url': document.location.href,
            'stack': stack,
            'useragent': navigator.userAgent
        };
    }

    /**
     * NOT TESTED.
     * Computes stack trace information from an error message that includes
     * the stack trace.
     * Opera 9 and earlier use this method if the option to show stack
     * traces is turned on in opera:config.
     * @param {Error} ex
     * @return {?Object.<string, *>} Stack information.
     */
    function computeStackTraceFromOperaMultiLineMessage(ex) {
        // Opera includes a stack trace into the exception message. An example is:
        //
        // Statement on line 3: Undefined variable: undefinedFunc
        // Backtrace:
        //   Line 3 of linked script file://localhost/Users/andreyvit/Projects/TraceKit/javascript-client/sample.js: In function zzz
        //         undefinedFunc(a);
        //   Line 7 of inline#1 script in file://localhost/Users/andreyvit/Projects/TraceKit/javascript-client/sample.html: In function yyy
        //           zzz(x, y, z);
        //   Line 3 of inline#1 script in file://localhost/Users/andreyvit/Projects/TraceKit/javascript-client/sample.html: In function xxx
        //           yyy(a, a, a);
        //   Line 1 of function script
        //     try { xxx('hi'); return false; } catch(ex) { TraceKit.report(ex); }
        //   ...

        var lines = ex.message.split('\n');
        if (lines.length < 4) {
            return null;
        }

        var lineRE1 = /^\s*Line (\d+) of linked script ((?:file|http|https)\S+)(?:: in function (\S+))?\s*$/i,
            lineRE2 = /^\s*Line (\d+) of inline#(\d+) script in ((?:file|http|https)\S+)(?:: in function (\S+))?\s*$/i,
            lineRE3 = /^\s*Line (\d+) of function script\s*$/i,
            stack = [],
            scripts = document.getElementsByTagName('script'),
            inlineScriptBlocks = [],
            parts,
            i,
            len,
            source;

        for (i in scripts) {
            if (_has(scripts, i) && !scripts[i].src) {
                inlineScriptBlocks.push(scripts[i]);
            }
        }

        for (i = 2, len = lines.length; i < len; i += 2) {
            var item = null;
            if ((parts = lineRE1.exec(lines[i]))) {
                item = {
                    'url': parts[2],
                    'func': parts[3],
                    'line': +parts[1]
                };
            } else if ((parts = lineRE2.exec(lines[i]))) {
                item = {
                    'url': parts[3],
                    'func': parts[4]
                };
                var relativeLine = (+parts[1]); // relative to the start of the <SCRIPT> block
                var script = inlineScriptBlocks[parts[2] - 1];
                if (script) {
                    source = getSource(item.url);
                    if (source) {
                        source = source.join('\n');
                        var pos = source.indexOf(script.innerText);
                        if (pos >= 0) {
                            item.line = relativeLine + source.substring(0, pos).split('\n').length;
                        }
                    }
                }
            } else if ((parts = lineRE3.exec(lines[i]))) {
                var url = window.location.href.replace(/#.*$/, ''),
                    line = parts[1];
                var re = new RegExp(escapeCodeAsRegExpForMatchingInsideHTML(lines[i + 1]));
                source = findSourceInUrls(re, [url]);
                item = {
                    'url': url,
                    'line': source ? source.line : line,
                    'func': ''
                };
            }

            if (item) {
                if (!item.func) {
                    item.func = guessFunctionName(item.url, item.line);
                }
                var context = gatherContext(item.url, item.line);
                var midline = (context ? context[Math.floor(context.length / 2)] : null);
                if (context && midline.replace(/^\s*/, '') === lines[i + 1].replace(/^\s*/, '')) {
                    item.context = context;
                } else {
                    // if (context) alert("Context mismatch. Correct midline:\n" + lines[i+1] + "\n\nMidline:\n" + midline + "\n\nContext:\n" + context.join("\n") + "\n\nURL:\n" + item.url);
                    item.context = [lines[i + 1]];
                }
                stack.push(item);
            }
        }
        if (!stack.length) {
            return null; // could not parse multiline exception message as Opera stack trace
        }

        return {
            'mode': 'multiline',
            'name': ex.name,
            'message': lines[0],
            'url': document.location.href,
            'stack': stack,
            'useragent': navigator.userAgent
        };
    }

    /**
     * Adds information about the first frame to incomplete stack traces.
     * Safari and IE require this to get complete data on the first frame.
     * @param {Object.<string, *>} stackInfo Stack trace information from
     * one of the compute* methods.
     * @param {string} url The URL of the script that caused an error.
     * @param {(number|string)} lineNo The line number of the script that
     * caused an error.
     * @param {string=} message The error generated by the browser, which
     * hopefully contains the name of the object that caused the error.
     * @return {boolean} Whether or not the stack information was
     * augmented.
     */
    function augmentStackTraceWithInitialElement(stackInfo, url, lineNo, message) {
        var initial = {
            'url': url,
            'line': lineNo
        };

        if (initial.url && initial.line) {
            stackInfo.incomplete = false;

            if (!initial.func) {
                initial.func = guessFunctionName(initial.url, initial.line);
            }

            if (!initial.context) {
                initial.context = gatherContext(initial.url, initial.line);
            }

            var reference = / '([^']+)' /.exec(message);
            if (reference) {
                initial.column = findSourceInLine(reference[1], initial.url, initial.line);
            }

            if (stackInfo.stack.length > 0) {
                if (stackInfo.stack[0].url === initial.url) {
                    if (stackInfo.stack[0].line === initial.line) {
                        return false; // already in stack trace
                    } else if (!stackInfo.stack[0].line && stackInfo.stack[0].func === initial.func) {
                        stackInfo.stack[0].line = initial.line;
                        stackInfo.stack[0].context = initial.context;
                        return false;
                    }
                }
            }

            stackInfo.stack.unshift(initial);
            stackInfo.partial = true;
            return true;
        } else {
            stackInfo.incomplete = true;
        }

        return false;
    }

    /**
     * Computes stack trace information by walking the arguments.caller
     * chain at the time the exception occurred. This will cause earlier
     * frames to be missed but is the only way to get any stack trace in
     * Safari and IE. The top frame is restored by
     * {@link augmentStackTraceWithInitialElement}.
     * @param {Error} ex
     * @return {?Object.<string, *>} Stack trace information.
     */
    function computeStackTraceByWalkingCallerChain(ex, depth) {
        var functionName = /function\s+([_$a-zA-Z\xA0-\uFFFF][_$a-zA-Z0-9\xA0-\uFFFF]*)?\s*\(/i,
            stack = [],
            funcs = {},
            recursion = false,
            parts,
            item,
            source;

        for (var curr = computeStackTraceByWalkingCallerChain.caller; curr && !recursion; curr = curr.caller) {
            if (curr === computeStackTrace || curr === TraceKit.report) {
                // console.log('skipping internal function');
                continue;
            }

            item = {
                'url': null,
                'func': UNKNOWN_FUNCTION,
                'line': null,
                'column': null
            };

            if (curr.name) {
                item.func = curr.name;
            } else if ((parts = functionName.exec(curr.toString()))) {
                item.func = parts[1];
            }

            if ((source = findSourceByFunctionBody(curr))) {
                item.url = source.url;
                item.line = source.line;

                if (item.func === UNKNOWN_FUNCTION) {
                    item.func = guessFunctionName(item.url, item.line);
                }

                var reference = / '([^']+)' /.exec(ex.message || ex.description);
                if (reference) {
                    item.column = findSourceInLine(reference[1], source.url, source.line);
                }
            }

            if (funcs['' + curr]) {
                recursion = true;
            }else{
                funcs['' + curr] = true;
            }

            stack.push(item);
        }

        if (depth) {
            // console.log('depth is ' + depth);
            // console.log('stack is ' + stack.length);
            stack.splice(0, depth);
        }

        var result = {
            'mode': 'callers',
            'name': ex.name,
            'message': ex.message,
            'url': document.location.href,
            'stack': stack,
            'useragent': navigator.userAgent
        };
        augmentStackTraceWithInitialElement(result, ex.sourceURL || ex.fileName, ex.line || ex.lineNumber, ex.message || ex.description);
        return result;
    }

    /**
     * Computes a stack trace for an exception.
     * @param {Error} ex
     * @param {(string|number)=} depth
     */
    function computeStackTrace(ex, depth) {
        var stack = null;
        depth = (depth == null ? 0 : +depth);

        try {
            // This must be tried first because Opera 10 *destroys*
            // its stacktrace property if you try to access the stack
            // property first!!
            stack = computeStackTraceFromStacktraceProp(ex);
            if (stack) {
                return stack;
            }
        } catch (e) {
            if (debug) {
                throw e;
            }
        }

        try {
            stack = computeStackTraceFromStackProp(ex);
            if (stack) {
                return stack;
            }
        } catch (e) {
            if (debug) {
                throw e;
            }
        }

        try {
            stack = computeStackTraceFromOperaMultiLineMessage(ex);
            if (stack) {
                return stack;
            }
        } catch (e) {
            if (debug) {
                throw e;
            }
        }

        try {
            stack = computeStackTraceByWalkingCallerChain(ex, depth + 1);
            if (stack) {
                return stack;
            }
        } catch (e) {
            if (debug) {
                throw e;
            }
        }

        return {
            'mode': 'failed'
        };
    }

    /**
     * Logs a stacktrace starting from the previous call and working down.
     * @param {(number|string)=} depth How many frames deep to trace.
     * @return {Object.<string, *>} Stack trace information.
     */
    function computeStackTraceOfCaller(depth) {
        depth = (depth == null ? 0 : +depth) + 1; // "+ 1" because "ofCaller" should drop one frame
        try {
            throw new Error();
        } catch (ex) {
            return computeStackTrace(ex, depth + 1);
        }

        return null;
    }

    computeStackTrace.augmentStackTraceWithInitialElement = augmentStackTraceWithInitialElement;
    computeStackTrace.guessFunctionName = guessFunctionName;
    computeStackTrace.gatherContext = gatherContext;
    computeStackTrace.ofCaller = computeStackTraceOfCaller;

    return computeStackTrace;
}());

/**
 * Extends support for global error handling for asynchronous browser
 * functions. Adopted from Closure Library's errorhandler.js
 */
(function extendToAsynchronousCallbacks() {
    var _helper = function _helper(fnName) {
        var originalFn = window[fnName];
        window[fnName] = function traceKitAsyncExtension() {
            // Make a copy of the arguments
            var args = _slice.call(arguments);
            var originalCallback = args[0];
            if (typeof (originalCallback) === 'function') {
                args[0] = TraceKit.wrap(originalCallback);
            }
            // IE < 9 doesn't support .call/.apply on setInterval/setTimeout, but it
            // also only supports 2 argument and doesn't care what "this" is, so we
            // can just call the original function directly.
            if (originalFn.apply) {
                return originalFn.apply(this, args);
            } else {
                return originalFn(args[0], args[1]);
            }
        };
    };

    _helper('setTimeout');
    _helper('setInterval');
}());

//Default options:
if (!TraceKit.remoteFetching) {
  TraceKit.remoteFetching = true;
}
if (!TraceKit.collectWindowErrors) {
  TraceKit.collectWindowErrors = true;
}
if (!TraceKit.linesOfContext || TraceKit.linesOfContext < 1) {
  // 5 lines before, the offending line, 5 lines after
  TraceKit.linesOfContext = 11;
}



// Export to global object
window.TraceKit = TraceKit;

}(window));
;/*jshint unused:false */
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

  /*
  easyxdm configuration
  requires: easyxdm
  Test for if easyXDM was loaded internally, and if so, ensure it doesn't conflict
  */
  if (LOCAL_EASY_XDM && context.easyXDM) {
    easyXDM = context.easyXDM.noConflict('Inject');
  }
  else {
    easyXDM = false;
  }
})();

/**
    Fiber.js instance
    @type {object}
    @global
 */
var Fiber = this.Fiber.noConflict();

/**
    TraceKit instance
    @type {object}
    @global
 */
var TraceKit = this.TraceKit.noConflict();;/*
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
var Analyzer;
(function () {
  var AsStatic = Fiber.extend(function () {
    return {
      /**
       * analyzer initialization
       * @constructs Analyzer
       */
      init: function () {},
      
      /**
       * Clean up moduleIds by removing all buildin modules
       * (requie, exports, module) from a given module list
       * @method Analyzer.stripBuiltins
       * @param {Array} modules - a dirty list of modules
       * @public
       * @returns {Array} a clean list of modules without buildins
       */

      stripBuiltins: function (modules) {

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
      extractRequires: function (file) {
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
  Analyzer = new AsStatic();
})();
;/*global context:true */
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
**/
var Communicator;
(function () {
  var AsStatic = Fiber.extend(function () {
    var pauseRequired = false;

    var socketConnectionQueue;
    var downloadCompleteQueue;

    var socket;

    /**
    * Clear the records to socket connections and
    * downloaded files
    * @function
    * @private
    **/
    function clearCaches() {
      socketConnectionQueue = [];
      downloadCompleteQueue = {};
    }

    /**
    * Write file contents to local storage
    * @function
    * @param {string} url - url to use as a key to store file content
    * @param {string} contents file contents to be stored in cache
    * @private
    * @returns a function adhearing to the lscache set() method
    **/
    function writeToCache(url, contents) {
      // lscache and passthrough
      if (userConfig.fileExpires > 0) {
        return lscache.set(url, contents, userConfig.fileExpires);
      }
      else {
        return null;
      }
    }

    /**
    * read cached file contents from local storage
    * @function
    * @param {string} url - url key that the content is stored under
    * @private
    * @returns the content that is stored under the url key
    *
    **/
    function readFromCache(url) {
      // lscache and passthrough
      if (userConfig.fileExpires > 0) {
        return lscache.get(url);
      }
      else {
        return null;
      }
    }

    /**
    * Utility function to cleanup Host name by removing leading
    * http or https string
    * @function
    * @param {string} host - The host name to trim.
    * @private
    * @returns hostname without leading http or https string
    **/
    function trimHost(host) {
      host = host.replace(HOST_PREFIX_REGEX, '').replace(HOST_SUFFIX_REGEX, '$1');
      return host;
    }

    /**
    * function that resolves all callbacks that are associated
    * to the loaded file
    * @function
    * @param {string} moduleId - The id of the module that has been loaded
    * @param {string} url - The location of the module that has loaded
    * @param {int} statusCode - The result of the attempt to load the file at url
    * @param {string} contents - The contents that were loaded from url
    * @private
    **/
    function resolveCompletedFile(moduleId, url, statusCode, contents) {
      statusCode = 1 * statusCode;
      debugLog('Communicator (' + url + ')', 'status ' + statusCode + '. Length: ' +
          ((contents) ? contents.length : 'NaN'));

      // write cache
      if (statusCode === 200 && ! userConfig.xd.relayFile ) {
        writeToCache(url, contents);
      }

      // locate all callbacks associated with the URL
      each(downloadCompleteQueue[url], function (cb) {
        if (statusCode !== 200) {
          if (Executor) {
            Executor.flagModuleAsBroken(moduleId);
          }
          cb(false);
        }
        else {
          cb(contents);
        }
      });
      downloadCompleteQueue[url] = [];
    }

    /**
    * Creates an easyXDM socket
    * @function
    * @private
    * @returns and instance of a easyXDM Socket
    **/
    function createSocket() {
      var relayFile = userConfig.xd.relayFile;
      var relaySwf = userConfig.xd.relaySwf || '';
      relayFile += (relayFile.indexOf('?') >= 0) ? '&' : '?';
      relayFile += 'swf=' + relaySwf;

      socket = new easyXDM.Socket({
        remote: relayFile,
        swf: relaySwf,
        onMessage: function (message, origin) {
          if (typeof(userConfig.moduleRoot) === 'string' && trimHost(userConfig.moduleRoot) !== trimHost(origin)) {
            return;
          }
          var pieces = message.split('__INJECT_SPLIT__');
          // pieces[0] moduleId
          // pieces[1] file URL
          // pieces[2] status code
          // pieces[3] file contents
          resolveCompletedFile(pieces[0], pieces[1], pieces[2], pieces[3]);
        },
        onReady: function () {
          pauseRequired = false;
          each(socketConnectionQueue, function (cb) {
            cb();
          });
          socketConnectionQueue = [];
        }
      });
    }

    /**
    * Creates a standard xmlHttpRequest
    * @function
    * @param {string} moduleId - id of the module for the request
    * @param {string} url - url where the content is located
    * @private
    **/
    function sendViaIframe(moduleId, url) {
      socket.postMessage(moduleId + '__INJECT_SPLIT__' + url);
    }

    /**
    * Get contents via xhr for cross-domain requests
    * @function
    * @param {string} moduleId - id of the module for the request
    * @param {string} url - url where the content is located
    * @private
    **/
    function sendViaXHR(moduleId, url) {
      var xhr = getXhr();
      xhr.open('GET', url);
      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          resolveCompletedFile(moduleId, url, xhr.status, xhr.responseText);
        }
      };
      xhr.send(null);
    }

    return {
      /**
      *   The Communicator object is meant to be instantiated once, and have its
      *   reference assigned to a location outside of the closure.
      *   @constructs Communicator
      **/
      init: function () {
        this.clearCaches();
      },

      /**
      * clear list of socket connections and list of downloaded files
      * @method Communicator.clearCaches
      * @public
      */
      clearCaches: function () {
        clearCaches();
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
        if (!downloadCompleteQueue[url]) {
          downloadCompleteQueue[url] = [];
        }

        debugLog('Communicator (' + url + ')', 'requesting');

        if( ! userConfig.xd.relayFile ) {
          var cachedResults = readFromCache(url);
          if (cachedResults) {
            debugLog('Communicator (' + url + ')', 'retireved from cache. length: ' + cachedResults.length);
            callback(cachedResults);
            return;
          }
        }

        debugLog('Communicator (' + url + ')', 'queued');
        if (downloadCompleteQueue[url].length) {
          downloadCompleteQueue[url].push(callback);
          debugLog('Communicator (' + url + ')', 'request already in progress');
          return;
        }
        downloadCompleteQueue[url].push(callback);

        if (userConfig.xd.relayFile && !socket && !pauseRequired) {
          pauseRequired = true;
          context.setTimeout(createSocket);
        }

        var socketQueuedFn = function () {
          sendViaIframe(moduleId, url);
        };

        if (pauseRequired) {
          socketConnectionQueue.push(socketQueuedFn);
        }
        else {
          if (userConfig.xd.relayFile) {
            sendViaIframe(moduleId, url);
          }
          else {
            sendViaXHR(moduleId, url);
          }
        }
      }
    };
  });
  Communicator = new AsStatic();
})();;/*jshint evil:true */
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
  
  //Cache to store errors thrown by failed modules(indexed by moduleId)
  //getModule uses this to return the right error when asked for a broken module
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

    // Parse file and catch any parse errors
    try {
      eval(code);
    }
    catch(ex) {
      // use LinkJS if available to generate a better error
      // this allows Inject to eventually have a .debug version for a 15k penalty
      if (LinkJS) {
        try {
          LinkJS.parse('function linktest() {' + options.originalCode + '\n}');
        }
        catch(e) {
          var linkJsLine;
          linkJsLine = parseInt(e.message.replace(/.+? at line (.+)$/, '$1'), 10);
          err = new Error('Parse error in ' + options.moduleId + ' (' + options.url + ') at line ' + linkJsLine);
        }
      }
      else {
        err = new Error('Parse error in ' + options.moduleId + ' (' + options.url + ') at line unknown');
      }
      try {
        throw err;
      }
      catch(tkerr) {
        sendToTraceKit(tkerr, options.moduleId);
        // exit early. This is not a usable module.
        return {
          __error: tkerr
        };
      }
    }

    var lineException, adjustedLineNumber;
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
      // generate an exception and capture the line number for later
      // you must keep try/catch and this eval on one line
      try { toExec.undefined_function(); } catch(ex) { lineException = ex; } eval(toExec);
      result = context.Inject.INTERNAL.execute[options.functionId];
      if (result.__error) {
        if (result.__error.lineNumber) {
          // firefox supports lineNumber as a property
          adjustedLineNumber = result.__error.lineNumber - options.preambleLength;
          adjustedLineNumber -= (lineException) ? lineException.lineNumber : 0;
        } else if (result.__error.line) {
          //safari supports line as a property AND structured stack messages, but line numbers for 
          //structured stack messages are problematic
          adjustedLineNumber = result.__error.line - options.preambleLength;
        } else if (result.__error.stack) {
          // chrome supports structured stack messages
          adjustedLineNumber = parseInt(result.__error.stack.toString().replace(/\n/g, ' ').replace(/.+?at .+?:(\d+).*/, '$1'), 10);
          adjustedLineNumber -= options.preambleLength;
        } else {
          adjustedLineNumber = 'unknown';
        }
        err = new Error('Runtime error in ' + options.moduleId + '(' + options.url + ') at line ' + adjustedLineNumber);
        err.stack = result.__error.stack;
        err.lineNumber = result.__error.lineNumber;
        sendToTraceKit(err, options.moduleId);
      }
    }
    else {
      // there is an executable object AND source maps are off
      // just run it. Try/catch will capture exceptions and put them
      // into result.__error internally for us from the commonjs harness
      // NOTE: these all receive "-1" due to the semicolon auto added by the Executor at the end of
      // the preamble.
      // __EXCEPTION__.lineNumber - Inject.INTERNAL.modules.exec2.__error_line.lineNumber - 1
      result = context.Inject.INTERNAL.execute[options.functionId]();
      if (result.__error) {
        if (result.__error.lineNumber) {
          // firefox supports lineNumber as a property
          adjustedLineNumber = result.__error.lineNumber;
          adjustedLineNumber -= result.__error_line.lineNumber;
          adjustedLineNumber -= 1;
        } else if (result.__error.line) { 
           //safari supports line as a property AND structured stack messages, but line numbers for 
          //structured stack messages are problematic
          adjustedLineNumber = result.__error.line;
          adjustedLineNumber -= result.__error_line.line;
          adjustedLineNumber -= 1;
        } else if (result.__error.stack) {
          // chrome supports structured stack messages
          adjustedLineNumber = parseInt(result.__error.stack.toString().replace(/\n/g, ' ').replace(/.+?at .+?:(\d+).*/, '$1'), 10);
          adjustedLineNumber -= parseInt(result.__error_line.stack.toString().replace(/\n/g, ' ').replace(/.+?at .+?:(\d+).*/, '$1'), 10);
          adjustedLineNumber -= 1;
        } else {
          adjustedLineNumber = 'unknown';
        }

        err = new Error('Runtime error in ' + options.moduleId + '(' + options.url + ') at line ' + adjustedLineNumber);
        err.stack = result.__error.stack;
        err.lineNumber = result.__error.lineNumber;
        sendToTraceKit(err, options.moduleId);
      }
    }


    // clean up the function or object we globally created if it exists
    if (context.Inject.INTERNAL.execute[options.functionId]) {
      delete context.Inject.INTERNAL.execute[options.functionId];
    }

    // return the results
    return result;
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
          var errorMessage = 'module ' + moduleId + ' failed to load successfully';
          var originalException = moduleFailureCache[moduleId];
          errorMessage += (originalException) ? ': ' + originalException.message : '';
          var e = new Error(errorMessage);
          
          if (originalException) {
            e.originalException = originalException;
            e.stack = originalException.stack;
          }

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
        if (result && result.__error) {
          // context[NAMESPACE].clearCache();
          // exit early, this module is broken
          this.executed[moduleId] = true;
          Executor.flagModuleAsBroken(moduleId);
          debugLog('Executor', 'broken', moduleId, path, result);
          return;
        }

        // cache the result (IF NOT AMD)
        if (!IS_AMD_REGEX.test(code)) {
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
;/*
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
 * The InjectCore is the main configuration point for Inject.
 * It is able to create require() and define() methods within a
 * path context, as well as assign configuration for the
 * various options.
 * @file
**/
var InjectCore;
(function () {
  var AsStatic = Fiber.extend(function () {
    return {
      /**
       * The InjectCore object is meant to be instantiated once, and have its
       * reference assigned to a location outside of the closure.
       * @constructs InjectCore
       */
      init: function () {},

      /**
       * create a require() method within a given context path
       * relative require() calls can be based on the provided
       * id and path
       * @method InjectCore.createRequire
       * @param {string} id - the module identifier for relative module IDs
       * @param {string} path - the module path for relative path operations
       * @public
       * @returns a function adhearing to CommonJS and AMD require()
       */
      createRequire: function (id, path) {
        var req = new RequireContext(id, path);
        var require = proxy(req.require, req);

        require.ensure = proxy(req.ensure, req);
        require.run = proxy(req.run, req);
        // resolve an identifier to a URL (AMD compatibility)
        require.toUrl = function (identifier) {
          var resolvedId = RulesEngine.resolveModule(identifier, id);
          var resolvedPath = RulesEngine.resolveFile(resolvedId, path, true);
          return resolvedPath;
        };
        return require;
      },

      /**
       * create a define() method within a given context path
       * relative define() calls can be based on the provided
       * id and path
       * @method InjectCore.createDefine
       * @param {string} id - the module identifier for relative module IDs
       * @param {string} path - the module path for relative path operations
       * @param {boolean} disableAMD - if provided, define.amd will be false, disabling AMD detection
       * @public
       * @returns a function adhearing to the AMD define() method
       */
      createDefine: function (id, path, disableAMD) {
        var req = new RequireContext(id, path);
        var define = proxy(req.define, req);
        define.amd = (disableAMD) ? false : {};
        return define;
      },

      /**
       * add a plugin to the Inject system
       * @method InjectCore.plugin
       * @param {string} plugin - the name of the plugin (comes before ! in require calls)
       * @param {object} ruleSet - a ruleSet to be assigned to addRule
       * @param {object} functions - a collection of functions to be made available under .plugins[plugin]
       */
      plugin: function (plugin, ruleSet, functions, scope) {
        RulesEngine.addRule(new RegExp('^' + plugin + '!'), ruleSet);
        scope.plugins = scope.plugins || {};
        scope.plugins[plugin] = functions;
      },

      /**
       * set the base path for all module includes
       * @method InjectCore.setModuleRoot
       * @param {string} root - the fully qualified URL for modules to be included from
       * @public
       */
      setModuleRoot: function (root) {
        userConfig.moduleRoot = root;
      },

      /**
       * set the cross domain configuration
       * the cross domain config is an object consisting of two properties,
       * the relayHtml and the relaySwf. The HTML and SWF file should be
       * located on the remote server (for example the CDN).
       * @method InjectCore.setCrossDomain
       * @param {object} crossDomainConfig - the confuiguration object
       * @public
       */
      setCrossDomain: function (crossDomainConfig) {
        userConfig.xd.relayFile = crossDomainConfig.relayFile || null;
        userConfig.xd.relaySwf = crossDomainConfig.relaySwf || null;
      },

      /**
       * Set the useSuffix value. useSuffix is used to determine globally if
       * a ".js" extension should be added to files by default
       * @method InjectCore.setUseSuffix
       * @param {Boolean} useSuffix - should a suffix be used
       * @public
       */
      setUseSuffix: function (useSuffix) {
        userConfig.useSuffix = useSuffix;
      },

      /**
       * clear the localstorage caches
       * @method InjectCore.clearCache
       * @public
       */
      clearCache: function () {
        if (HAS_LOCAL_STORAGE && lscache) {
          lscache.flush();
        }
      },

      /**
       * set a time (in seconds) for how long to preserve items in cache
       * the default time is 300 seconds
       * @method InjectCore.setExpires
       * @param {int} seconds - the number of seconds to retain files for
       * @public
       * @see userConfig.fileExpires
       */
      setExpires: function (seconds) {
        userConfig.fileExpires = seconds || 0;
      },

      /**
       * set a unique cache identifier for Inject. This allows the parent
       * page to "bust" the cache by invoking setCacheKey with a different
       * value.
       * @method InjectCore.setCacheKey
       * @param {string} cacheKey - the identifier to reference this cache version
       * @public
       */
      setCacheKey: function (cacheKey) {
        var lscacheAppCacheKey;

        if (!HAS_LOCAL_STORAGE || !lscache) {
          return false;
        }

        lscacheAppCacheKey = lscache.get(LSCACHE_APP_KEY_STRING);

        if ((!cacheKey && lscacheAppCacheKey) ||
             (lscacheAppCacheKey !== null && lscacheAppCacheKey !== cacheKey) ||
             (lscacheAppCacheKey === null && cacheKey)) {
          lscache.flush();
          lscache.set(LSCACHE_APP_KEY_STRING, cacheKey);
        }
      },

      /**
       * reset the entire Inject system. This clears the cache, execution caches,
       * and any communicator caches.
       * @method InjectCore.reset
       * @public
       */
      reset: function () {
        this.clearCache();
        Executor.clearCaches();
        Communicator.clearCaches();
      },

      /**
       * enable debugging options. For a full list of debugging options,
       * the wiki page for "Debugging Options" lists the possible keys
       * and impact
       * @method InjectCore.enableDebug
       * @param {string} key - the debugging key to enable or disable
       * @param {boolean} value - the value to assign for the key, defaults to true
       * @public
       */
      enableDebug: function (key, value) {
        userConfig.debug[key] = value || true;
      }
    };
  });
  // Assign the instantiated object outside of our closure
  InjectCore = new AsStatic();
})();
;/*global context:true */
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
var RequireContext = Fiber.extend(function () {
  return {
    /**
     * Creates a new RequireContext
     * @constructs RequireContext
     * @param {String} id - the current module ID for this context
     * @param {String} path - the current module URL for this context
     * @public
     */
    init: function (id, path) {
      this.id = id || null;
      this.path = path || null;
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
      if (!userConfig.moduleRoot) {
        throw new Error('moduleRoot must be defined. Please use Inject.setModuleRoot()');
      }
      return this.path || userConfig.moduleRoot;
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
     * Get the module for a provided module ID. Used as a passthrough
     * to collect modules during depenency resolution
     * @method requireContext#getModule
     * @param {String} moduleId - the module ID to retrieve
     * @protected
     * @see Executor.getModule
     */
    getModule: function (moduleId) {
      return Executor.getModule(moduleId).exports;
    },

    /**
     * Get all modules that have loaded up to this point based on
     * a list. Require and module calls are transparently added
     * to the output
     * @method RequireContext#getAllModules
     * @param {Array|String} moduleIdOrList - a single or list of modules to resolve
     * @param {Function} require - a require function, usually from a RequireContext
     * @param {Object} module - a module representing the current executor, from Executor
     * @protected
     * @returns {Array} an array of modules matching moduleIdOrList
     */
    getAllModules: function (moduleIdOrList, require, module) {
      var args = [];
      var mId = null;
      for (var i = 0, len = moduleIdOrList.length; i < len; i++) {
        mId = moduleIdOrList[i];
        switch (mId) {
        case 'require':
          args.push(require);
          break;
        case 'module':
          args.push(module);
          break;
        case 'exports':
          args.push(module.exports);
          break;
        default:
          // push the resolved item onto the stack direct from executor
          args.push(this.getModule(mId));
        }
      }
      return args;
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
      var identifier;
      var assignedModule;

      if (typeof(moduleIdOrList) === 'string') {
        this.log('CommonJS require(string) of ' + moduleIdOrList);
        if (/^[\d]+$/.test(moduleIdOrList)) {
          throw new Error('require() must be a string containing a-z, slash(/), dash(-), and dots(.)');
        }

        // try to get the module a couple different ways
        identifier = RulesEngine.resolveModule(moduleIdOrList, this.getId());
        module = Executor.getModule(identifier);
        assignedModule = Executor.getAssignedModule(this.getId(), identifier);

        // try the assignment identifier
        if (assignedModule) {
          return assignedModule.exports;
        }
        // then try the module
        else if (module) {
          return module.exports;
        }
        // or fail
        else {
          throw new Error('module ' + moduleIdOrList + ' not found');
        }
      }

      // AMD require
      this.log('AMD require(Array) of ' + moduleIdOrList.join(', '));
      this.ensure(moduleIdOrList, proxy(function (localRequire) {
        var module = Executor.createModule();
        var modules = this.getAllModules(moduleIdOrList, localRequire, module);
        callback.apply(context, modules);
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
      moduleList = Analyzer.stripBuiltins(moduleList);

      var tn;
      var td;
      var callsRemaining = moduleList.length;
      var thisPath = (this.getPath()) ? this.getPath() : userConfig.moduleRoot;
      var downloadCommand = proxy(function (root, files) {
        Executor.runTree(root, files, proxy(function () {
          // test if all modules are done
          if (--callsRemaining === 0) {
            if (callback) {
              callback(InjectCore.createRequire(this.getId(), this.getPath()));
            }
          }
        }, this));
      }, this);

      // exit early when we have no builtins left
      if (!callsRemaining) {
        if (callback) {
          callback(InjectCore.createRequire(this.getId(), this.getPath()));
        }
        return;
      }

      // for each module, spawn a download. On download, spawn an execution
      // when all executions have ran, fire the callback with the local require
      // scope
      for (var i = 0, len = moduleList.length; i < len; i++) {
        tn = TreeDownloader.createNode(moduleList[i], thisPath);
        td = new TreeDownloader(tn);
        // get the tree, then run the tree, then --count
        // if count is 0, callback
        td.get(downloadCommand);
      }
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
      var executionFunctionOrLiteral = {};
      var remainingDependencies = [];
      var resolvedDependencyList = [];
      var tempModuleId = null;

      // these are the various AMD interfaces and what they map to
      // we loop through the args by type and map them down into values
      // while not efficient, it makes this overloaed interface easier to
      // maintain
      var interfaces = {
        'string array object': ['id', 'dependencies', 'executionFunctionOrLiteral'],
        'string object':       ['id', 'executionFunctionOrLiteral'],
        'array object':        ['dependencies', 'executionFunctionOrLiteral'],
        'object':              ['executionFunctionOrLiteral']
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
        case 'executionFunctionOrLiteral':
          executionFunctionOrLiteral = value;
          break;
        }
      }

      this.log('AMD define(...) of ' + ((id) ? id : 'anonymous'));

      // strip any circular dependencies that exist
      // this will prematurely create modules
      for (i = 0, len = dependencies.length; i < len; i++) {
        if (BUILTINS[dependencies[i]]) {
          // was a builtin, skip
          resolvedDependencyList.push(dependencies[i]);
          continue;
        }
        // TODO: amd dependencies are resolved FIRST against their current ID
        // then against the module Root (huge deviation from CommonJS which uses
        // the filepaths)
        tempModuleId = RulesEngine.resolveModule(dependencies[i], this.getId());
        resolvedDependencyList.push(tempModuleId);
        if (!Executor.isModuleCircular(tempModuleId) && !Executor.isModuleDefined(tempModuleId)) {
          remainingDependencies.push(dependencies[i]);
        }
      }

      // handle anonymous modules
      if (!id) {
        currentExecutingAMD = Executor.getCurrentExecutingAMD();
        if (currentExecutingAMD) {
          id = currentExecutingAMD.id;
        }
        else {
          throw new Error('Anonymous AMD module used, but it was not included as a dependency. This is most often caused by an anonymous define() from a script tag.');
        }
        this.log('AMD identified anonymous module as ' + id);
      }

      if (Executor.isModuleDefined(id)) {
        this.log('AMD module ' + id + ' has already ran once');
        return;
      }
      Executor.flagModuleAsDefined(id);

      if (!dependenciesDeclared && typeof(executionFunctionOrLiteral) === 'function') {
        // with Link.JS, we need to convert from a function object to
        // a statement
        var fnBody = ['(', executionFunctionOrLiteral.toString(), ')'].join('');
        var analyzedRequires = Analyzer.extractRequires(fnBody);
        dependencies.concat(analyzedRequires);
      }

      this.log('AMD define(...) of ' + id + ' depends on: ' + dependencies.join(', '));
      this.log('AMD define(...) of ' + id + ' will retrieve: ' + remainingDependencies.join(', '));

      // ask only for the missed items + a require
      remainingDependencies.unshift('require');
      this.ensure(remainingDependencies, proxy(function (require) {
        this.log('AMD define(...) of ' + id + ' all downloads required');

        // use require as our first arg
        var module = Executor.getModule(id);

        // if there is no module, it was defined inline
        if (!module) {
          module = Executor.createModule(id);
        }

        var resolvedDependencies = this.getAllModules(resolvedDependencyList, require, module);
        var results;

        // if the executor is a function, run it
        // if it is an object literal, walk it.
        if (typeof(executionFunctionOrLiteral) === 'function') {
          results = executionFunctionOrLiteral.apply(null, resolvedDependencies);
          if (results) {
            module.setExports(results);
          }
        }
        else {
          for (var modName in executionFunctionOrLiteral) {
            module.exports[modName] = executionFunctionOrLiteral[modName];
          }
        }

      }, this));
    }
  };
});

RequireContext = RequireContext;;/*
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

var RulesEngine;
(function () {

  // this regex is used to strip leading slashes
  var LEADING_SLASHES_REGEX = /^\/+/g;

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

  var AsStatic = Fiber.extend(function () {
    return {
      /**
       * Create a RulesEngine Object
       * @constructs RulesEngine
       */
      init: function () {
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
        // if (!this.dirty.moduleRules && this.caches.moduleRules[moduleId]) {
        //   return this.caches.moduleRules[moduleId];
        // }

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
        // if (!this.dirty.fileRules && this.caches.fileRules[path]) {
        //   return this.caches.fileRules[path];
        // }

        this.sort('fileRules');
        var lastPath = path;
        var i = 0;
        var rules = this.fileRules;
        var len = rules.length;
        var isMatch = false;
        var matches;
        var fn;

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
        if (!userConfig.moduleRoot) {
          throw new Error('module root needs to be defined for resolving URLs');
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
        if (relativeTo && !userConfig.baseDir) {
          relativeTo = relativeTo.replace(PROTOCOL_REGEX, PROTOCOL_EXPANDED_STRING).split('/');
          if (relativeTo[relativeTo.length - 1] && relativeTo.length !== 1) {
            // not ending in /
            relativeTo.pop();
          }
          relativeTo = relativeTo.join('/').replace(PROTOCOL_EXPANDED_REGEX, PROTOCOL_STRING);
        }
        else if (relativeTo) {
          relativeTo = userConfig.baseDir(relativeTo);
        }
        else {
          relativeTo = userConfig.moduleRoot;
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
        if (!noSuffix && userConfig.useSuffix && !FILE_SUFFIX_REGEX.test(lastPath)) {
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

        base = base || '';

        // exit early on resolved :// in a URL
        if (ABSOLUTE_PATH_REGEX.test(id)) {
          return id;
        }

        blownApartURL = [].concat(base.split('/'), id.split('/'));
        for (var i = 0, len = blownApartURL.length; i < len; i++) {
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
  RulesEngine = new AsStatic();
})();
;/*
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
 * TreeDownloader, as its name implies, downloads a tree starting
 * at its root node. Once all nodes have been downloaded, a
 * callback can be invoked. Circular references are resolved
 * into a downloaded state and the TreeNode object is flagged
 * as downloaded.
 * @file
**/
var TreeDownloader = Fiber.extend(function () {
  return {
    /**
     * Create a TreeDownloader with a root node. From this node,
     * it and its children can be analyzed and downloaded
     * @constructs TreeDownloader
     * @param {TreeNode} root - the root TreeNode to download
     */
    init: function (root) {
      this.callsRemaining = 0;
      this.root = root;
      this.files = {};
    },

    /**
     * A logging function to help keep track of which "root" a call
     * comes from
     * @method TreeDownloader#log
     * @param {variable} args - a collection of args to output
     * @protected
     */
    log: function () {
      var args = [].slice.call(arguments, 0);
      var name = (this.root.getValue()) ? this.root.getValue().name : null;
      debugLog('TreeDownloader (' + name + ')', args.join(' '));
    },

    /**
     * Reduces the total number of calls remaining
     * If the calls reach 0, the callback is invoked with the provided
     * arguments
     * @method TreeDownloader#reduceCallsRemaining
     * @param {function} callback - a callback to run if 0 calls remain
     * @param {array} args - a collection of arguments for callback
     * @protected
     */
    reduceCallsRemaining: function (callback, args) {
      this.callsRemaining--;
      this.log('reduce. outstanding', this.callsRemaining);
      // TODO: there is a -1 logic item here to fix
      if (this.callsRemaining <= 0) {
        callback.call(null, args);
      }
    },

    /**
     * increase the total number of calls remaining
     * @method TreeDownloader#increaseCallsRemaining
     * @param {int} by - an amount to increase by, defaults to 1
     * @protected
     */
    increaseCallsRemaining: function (by) {
      this.callsRemaining += by || 1;
      this.log('increase. outstanding', this.callsRemaining);
    },

    /**
     * get a collection of the files downloaded
     * @method TreeDownloader#getFiles
     * @public
     * @returns {object} an object containing url/file pairs
     */
    getFiles: function () {
      return this.files;
    },

    /**
     * download the tree, invoking a callback on completion
     * This recursively downloads an entire tree
     * Consider the following tree:
     * <pre>
     *     root
     *     /  \
     *    A    B
     *   / \   |
     *  B   C  D
     *  |      |
     *  D      A
     *  |     / \
     * (A)  (B)  C
     * </pre>
     * root: no-download. Add A, Add B. Spawn A, Spawn B // count = 0 + 2 = 2 (add A, add B)<br>
     * A: download. Add B, Add C. Spawn C (B logged) // count = 2 - 1 + 1 = 2 (remove A, add C)<br>
     * B: download. Add D. Spawn D // count = 2 - 1 + 1 = 2 (remove B, add D)<br>
     * C: download // count = 2 - 1 = 1 (remove C)<br>
     * D: download // count = 1 - 1 = 0 (remove D)
     * @method TreeDownloader#get
     * @param {function} callback - a callback invoked on completion
     * @public
     */
    get: function (callback) {
      this.log('started download');
      this.downloadTree(this.root, proxy(function () {
        callback(this.root, this.getFiles());
      }, this));
    },

    /**
     * The recursive loop of tree downloading, spawned by the top
     * level get() call. A callback is called at the "complete" state,
     * when all its dependencies have also been downloaded.
     * @method TreeDownloader#downloadTree
     * @param {TreeNode} node - a TreeNode to download and analyze
     * @param {function} callback - a callback to invoke when this node is "complete"
     * @protected
     */
    downloadTree: function (node, callback) {
      // Normalize Module Path. Download. Analyze.
      var parentName =  (node.getParent() && node.getParent().getValue()) ?
                         node.getParent().getValue().resolvedId :
                         '';
      var getFunction = null;

      // get the path and REAL identifier for this module (resolve relative references)
      var identifier = RulesEngine.resolveModule(node.getValue().name, parentName);

      // modules are relative to identifiers, not to URLs
      node.getValue().path = RulesEngine.resolveFile(identifier);

      node.getValue().resolvedId = identifier;

      // top level starts at 1
      if (!node.getParent()) {
        this.increaseCallsRemaining();
      }

      // do not bother to download AMD define()-ed files
      if (Executor.isModuleDefined(node.getValue().name)) {
        this.log('AMD defined module, no download required', node.getValue().name);
        this.reduceCallsRemaining(callback, node);
        return;
      }

      var commParentName = (node.getParent()) ? node.getParent().getValue().name : '';
      var parentUrl = (node.getParent()) ? node.getParent().getValue().path : '';
      var fetchRules = RulesEngine.getFetchRules(identifier);
      var communicatorFn = Communicator.noop;
      var commFlow = new Flow();
      var commFlowResolver = {
        module: function() {
          return RulesEngine.resolveModule.apply(RulesEngine, arguments);
        },
        url: function() {
          return RulesEngine.resolveFile.apply(RulesEngine, arguments);
        }
      };
      var commFlowCommunicator = {
        get: function() {
          return Communicator.get.apply(Communicator, arguments);
        }
      };
      var addToCommFlow = function(fn) {
        // (next, content, moduleId, resolver, options)
        commFlow.seq(function (next, error, contents) {
          fn(next, contents, commFlowResolver, commFlowCommunicator, {
            moduleId: node.getValue().name,
            parentId: commParentName,
            parentUrl: parentUrl
          });
        });
      };
      if (fetchRules.length > 0) {
        // build an async flow chaining fetch calls together
        communicatorFn = function(name, path, cb) {
          commFlow.seq(function(next) {
            next(null, '');
          });
          for (var i = 0, len = fetchRules.length; i < len; i++) {
            addToCommFlow(fetchRules[i]);
          }
          commFlow.seq(function (next, error, contents) {
            cb(contents);
          });
        };
      }
      else if (node.getValue().path) {
        communicatorFn = Communicator.get;
      }

      this.log('requesting file', node.getValue().name + ' @ ' + node.getValue().path);
      communicatorFn(node.getValue().name, node.getValue().path, proxy(function (downloadedContent) {
        this.log('download complete', node.getValue().path);

        /*
        IMPORTANT
        This next section uses a flow control library, as afterDownload is the "new" style
        pointcut. It enables cool stuff like making external requests as part of the mutation,
        direct assignment, and more. The flow library we use is intentionally very simple.
        Please see https://github.com/jeromeetienne/gowiththeflow.js to learn more about the
        really small library we opted to use.
        */
        var pointcuts = RulesEngine.getContentRules(node.getValue().path);
        var i, j, len, jLen, found;
        var apFlow = new Flow();

        apFlow.seq(function (next) {
          next(null, downloadedContent);
        });
        var makeFlow = function (fn) {
          apFlow.seq(function (next, error, contents) {
            fn(next, contents);
          });
        };
        for (i = 0, len = pointcuts.length; i < len; i++) {
          makeFlow(pointcuts[i]);
        }

        // once all contents are resolved, see if we have an object (a neat assignment trick)
        // or a string. If we get an object, assign it to a special exports that says it was
        // invoked FROM a specific location. This helps require() find the module later
        apFlow.seq(proxy(function (next, error, contents) {
          if (typeof(contents) !== 'string' && typeof(contents) === 'object') {
            Executor.assignModule(parentName, identifier, node.getValue().path, contents);
            return this.reduceCallsRemaining(callback, node);
          }
          if (typeof(contents) === 'undefined') {
            // no content was returned at all. This happens when there is explicitly nothing to eval
            return this.reduceCallsRemaining(callback, node);
          }

          var parent = node;
          var found = {};
          var value;

          // seed found with the first item
          found[node.getValue().name] = true;
          parent = parent.getParent();
          // test if you are a circular reference. check every parent back to root
          while (parent) {
            if (!parent.getValue()) {
              // reached root
              break;
            }

            value = parent.getValue().name;
            if (found[value]) {
              this.log('circular reference found', node.getValue().name);
              // flag the node as circular (commonJS) and the module itself (AMD)
              node.flagCircular();
              Executor.flagModuleAsCircular(node.getValue().name);
            }
            found[value] = true;
            parent = parent.getParent();
          }

          // if it is not circular, and we have contents
          if (!node.isCircular() && contents) {
            // store file contents for later
            this.files[node.getValue().name] = contents;

            var results;
            
            try {
              results = Analyzer.extractRequires(contents);
            }
            catch(e) {
              // an exception in parsing causes there to be no requires
              // exceptions are handled on execution
              results = [];
            }
            var tempRequires = results;
            var requires = [];
            var childNode;
            var name;
            var path;
            var i;
            var callReduceCommand = proxy(function () {
              this.reduceCallsRemaining(callback, node);
            }, this);

            // remove already-defined AMD modules before we go further
            for (i = 0, len = tempRequires.length; i < len; i++) {
              name = RulesEngine.resolveModule(tempRequires[i], node.getValue().resolvedId);
              if (!Executor.isModuleDefined(name) && !Executor.isModuleDefined(tempRequires[i])) {
                requires.push(tempRequires[i]);
              }
            }

            this.log('dependencies (' + requires.length + '):' + requires.join(', '));

            // for each requires, create a child and spawn
            if (requires.length) {
              this.increaseCallsRemaining(requires.length);
            }
            for (i = 0, len = requires.length; i < len; i++) {
              name = (results.amd) ? RulesEngine.resolveModule(requires[i], node.getValue().resolvedId): requires[i];
              path = ''; // calculate path on recusion using parent
              childNode = TreeDownloader.createNode(name, path);
              node.addChild(childNode);
              this.downloadTree(childNode, callReduceCommand);
            }
          }

          // if contents was a literal false, we had an error
          if (contents === false) {
            node.getValue().failed = true;
          }

          // this module is processed
          this.reduceCallsRemaining(callback, node);
        }, this));
      }, this));
    }
  };
});
/**
 * Create a TreeNode object through a factory
 * @method TreeDownloader.createNode
 * @param {string} name - the moduleId for the tree node
 * @param {string} path - the URL for the module
 * @public
 * @returns {TreeNode} the created TreeNode object
 */
TreeDownloader.createNode = function (name, path) {
  var tn = new TreeNode({
    name: name,
    path: path,
    failed: false
  });
  return tn;
};
;/*
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
var TreeNode = Fiber.extend(function () {
  return {
    /**
     * Create a TreeNode with a defined value
     * @constructs TreeNode
     * @param {TreeNode} value - the value of this node
     */
    init: function (value) {
      this.value = value;
      this.children = [];
      this.left = null;
      this.right = null;
      this.parent = null;
      this.isCircularNode = false;
    },

    /**
     * Get the value associated with the TreeNode
     * @method TreeNode#getValue
     * @public
     * @returns {variable} the value of the node
     */
    getValue: function () {
      return this.value;
    },

    /**
     * Flag this tree node as circular
     * @method TreeNode#flagCircular
     * @public
     */
    flagCircular: function () {
      this.isCircularNode = true;
    },

    /**
     * return if this node is a circular reference
     * @method TreeNode#isCircular
     * @public
     * @returns {boolean} true if this is a circular reference
     */
    isCircular: function () {
      return this.isCircularNode;
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
        output.push(currentNode.getValue());
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

TreeNode = TreeNode;;/*global context:true */
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
    // used by the executor. these let inject know the module that is currently running
    defineExecutingModuleAs: proxy(Executor.defineExecutingModuleAs, Executor),
    undefineExecutingModule: proxy(Executor.undefineExecutingModule, Executor),
    createModule: proxy(Executor.createModule, Executor),
    setModuleExports: function () {},

    // a hash of publicly reachable module sandboxes ie exec0, exec1...
    execute: {},

    // a hash of publicly reachable module objects ie exec0's modules, exec1's modules...
    modules: {},

    // a hash of publicly reachable executor scopes ie exec0's __exe function
    execs: {},

    // a globally available require() call for the window and base page
    globalRequire: globalRequire,

    // creates require and define methods as passthrough
    createRequire: proxy(InjectCore.createRequire, InjectCore),
    createDefine: proxy(InjectCore.createDefine, InjectCore)
  },

  plugins: {},
  
  /**
      Exposes easyXDM API for doing cross-domain messaging.
      @see <a href="http://www.easyxdm.net">easyXDM</a>
      @public
   */
  easyXDM: easyXDM,
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
      var requestorName = options.parentId;
      var requestorUrl = options.parentUrl;

      var pieces = moduleName.split('!');
      var pluginId = resolver.module(pieces[0], requestorName);
      var pluginUrl = resolver.url(pluginId, requestorUrl);
      var identifier = pieces[1];

      var rq = Inject.createRequire(moduleName, requestorUrl);
      rq.ensure([pluginId], function (pluginRequire) {
        // the plugin must come from the contextual require
        // any subsequent fetching depends on the resolved plugin's location
        var plugin = pluginRequire(pluginId);
        var remappedRequire = Inject.createRequire(pluginId, pluginUrl);

        var resolveIdentifier = function (name) {
          return resolver.module(name, requestorName);
        };
        var normalized = (plugin.normalize) ? plugin.normalize(identifier, resolveIdentifier) : resolveIdentifier(identifier);
        var complete = function (contents) {
          if (typeof(contents) === 'string') {
            contents = ['module.exports = decodeURIComponent("', encodeURIComponent(contents), '");'].join('');
          }
          next(null, contents);
        };
        complete.fromText = function (ftModname, body) {
          if (!body) {
            body = ftModname;
            ftModname = null;
          }

          // use the executor
          Executor.runModule(ftModname, body, pluginUrl);

          next(null, body);
        };
        plugin.load(normalized, remappedRequire, complete, {});
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
      context.define = Inject.INTERNAL.createDefine(null, null, true);
    }
    else {
      context.define = Inject.INTERNAL.createDefine();
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

  createRequire: function() {
    return InjectCore.createRequire.apply(InjectCore, arguments);
  },

  createDefine: function() {
    return InjectCore.createDefine.apply(InjectCore, arguments);
  },

  /**
      CommonJS and AMD require()
      @see InjectCore.createRequire
      @see <a href="http://wiki.commonjs.org/wiki/Modules/1.1">CommonJS require()</a>
      @see <a href="https://github.com/amdjs/amdjs-api/wiki/require">AMD require()</a>
      @method
      @public
   */
  require: InjectCore.createRequire(),
  /**
      AMD define()
      @see InjectCore.createDefine
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
context.require = context.Inject.INTERNAL.createRequire();

/**
    AMD define()
    @see InjectCore.createDefine
    @see <a href="https://github.com/amdjs/amdjs-api/wiki/AMD">AMD define()</a>
    @method
    @public
 */
context.define = context.Inject.INTERNAL.createDefine();
;context.Inject.version = "0.5.0-32-g70bf477";
})(this);