/**
 * @license
 * Inject (c) 2011 LinkedIn [https://github.com/linkedin/inject] Apache Software License 2.0
 * lscache (c) 2011 Pamela Fox [https://github.com/pamelafox/lscache] Apache Software License 2.0
 * Link.js (c) 2012 Calyptus Life AB, Sweden [https://github.com/calyptus/link.js] Simplified BSD & MIT License
 * GoWithTheFlow.js (c) 2011 Jerome Etienne, [https://github.com/jeromeetienne/gowiththeflow.js] MIT License
 * easyXDM (c) 2011 2009-2011 Øyvind Sean Kinsey, oyvind@kinsey.no [https://github.com/oyvindkinsey/easyXDM] MIT License
 */
;(function(context, undefined) {
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

/**
 * a simple sniff to determine if this is the FF engine
 * @constant
 */
var IS_GK = false;

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
 * extract require() statements from within a larger string
 * @constant
 */
var REQUIRE_REGEX = /(?:^|[^\w\$_.\(])require\s*\(\s*("[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*')\s*\)/g;

/**
 * extract define() statements from within a larger string
 * note: this was changed to resolve #177, we used the
 * don't-be-greedy modifiers on the \S and \w\W sections
 * @constant
 */
var DEFINE_EXTRACTION_REGEX = /(?:^|[\s]+)define[\s]*\([\s]*((?:"|')\S+?(?:"|'))?,?[\s]*(?:\[([\w\W]+?)\])?/g;

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
      resolving an identifier to a URL.  @see RulesEngine.resolveUrl
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
  fileExpires: 300,
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
})();
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
  '      var module = __INJECT_NS__.INTERNAL.modules.__FUNCTION_ID__,',
  '          require = __INJECT_NS__.INTERNAL.createRequire(module.id, module.uri),',
  '          define = __INJECT_NS__.INTERNAL.createDefine(module.id, module.uri),',
  '          exports = module.exports;',
  '']).join('\n');

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
  '    __error = window.onerror;',
  '    try {',
  '      __INJECT_NS__.INTERNAL.execs.__FUNCTION_ID__.call(__INJECT_NS__.INTERNAL.modules.__FUNCTION_ID__);',
  '    }',
  '    catch (__EXCEPTION__) {',
  '      __INJECT_NS__.INTERNAL.modules.__FUNCTION_ID__.error = __EXCEPTION__;',
  '    }',
  '    __INJECT_NS__.INTERNAL.undefineExecutingModule();',
  '    return __INJECT_NS__.INTERNAL.modules.__FUNCTION_ID__;',
  '  }',
  '};',
  '']).join('\n');

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

// CLASS impl
/**
 * Class Inheritance model
 *
 * Copyright (c) 2012 LinkedIn.
 * All Rights Reserved. Apache Software License 2.0
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
( function( window ){
  // Stores whether the object is being initialized, and thus not
  // run the <init> function, or not.
  var initializing = false;

  function copy(from, to) {
    var name;
    for( name in from ){
      if( from.hasOwnProperty( name ) ){
        to[name] = from[name];
      }
    }
  }

  // The base Class implementation
  function Class(){};

  var _Class = window.Class;
  Class.noConflict = function() {
    window.Class = _Class;
    return Class;
  };

  // Create a new Class that inherits from this class
  Class.extend = function( fn ){
    // Keep a reference to the current prototye
    var base = this.prototype,
      // Invoke the function which will return an object literal used to define
      // the prototype. Additionally, pass in the parent prototype, which will
      // allow instances to use it
      properties = fn( base ),
      // Stores the constructor's prototype
      proto;

       // The dummy class constructor
      function constructor(){
        if( !initializing && typeof this.init === 'function' ){
          // All construction is done in the init method
          this.init.apply( this, arguments );
          // Prevent any re-initializing of the instance
          this.init = null;
        }
      }

      // Instantiate a base class (but only create the instance, don't run the init function),
      // and make every <constructor> instance an instanceof <this> and of <constructor>
      initializing = true;
      proto = constructor.prototype = new this;
      initializing = false;

       // Copy the properties over onto the new prototype
      copy( properties, proto );

      // return a proxy object for accessing this as a superclass
      proto.createSuper = function( subclass ){
        var props = proto,
            iface = {},
            wrap = function(scope, fn) {
              return function() {
                return fn.apply(scope, arguments);
              };
            };
        for( name in props ){
          if( props.hasOwnProperty( name ) ){
            iface[name] = wrap(subclass, props[name]);
          }
        }
        return iface;
      };

      // Enforce the constructor to be what we expect
      proto.constructor = constructor;

      // Keep a reference to the parent prototype.
      // This is needed in order to support decorators
      constructor.__base = base;

       // Make this class extendable
      constructor.extend = Class.extend;

      // Add ability to create singleton
      constructor.singleton = Class.singleton;

      // ... as well as mixin ability
      constructor.mixin = function( /* mixin[s] */ ) {
        var i,
          len = arguments.length

        for( i = 0; i < len; i++ ){
          copy( arguments[i]( base ), proto );
        }
      }

      return constructor;
  };

  // Returns a proxy object for accessing base methods
  // with a given context
  Class.proxy = function( base, instance ) {
    var name,
        iface = {},
        wrap = function( fn ) {
          return function() {
            return base[fn].apply( instance, arguments );
          };
        };

    // Create a wrapped method for each method in the base
    // prototype
    for( name in base ){
      if( base.hasOwnProperty( name ) && typeof base[name] === 'function' ){
        iface[name] = wrap( name );
      }
    }
    return iface;
  }

  // Decorates an instance
  Class.decorate = function( instance /*, decorator[s]*/ ) {
    var i,
      len = arguments.length,
      base = instance.constructor.__base;

    for( i = 1; i < len; i++ ){
      arguments[i].call( instance, base );
    }
  }

  // Return a singleton
  Class.singleton = function( fn ) {
    var obj = this.extend( fn ),
      args = arguments;

    return (function() {
      var instance;

      return {
        getInstance: function() {
          var temp;

          // Create an instance, if it does not exist
          if ( !instance ) {

            // If there are additional arguments specified, they need to be
            // passed into the constructor.
            if ( args.length > 1 ) {
              // temporary constructor
              temp = function(){};
              temp.prototype = obj.prototype;

              instance = new temp;

              // call the original constructor with 'instance' as the context
              // and the rest of the arguments
              obj.prototype.constructor.apply( instance, Array.prototype.slice.call( args, 1 ) );

            } else {
              instance = new obj();
            }

          }

          return instance;
        }
      }
    })();
  }

   //Export to Common JS Loader
  if( typeof module !== 'undefined' && typeof module !== 'function' ){
    if( typeof module.setExports === 'function' ){
      module.setExports( Class );
    } else if( module.exports ){
      module.exports = Class;
    }
  } else {
    window.Class = Class;
  }

}( window ) );
/*jshint multistr:true */

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

// version: 0.12;

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
        (token.type === Punctuator && '!(=:,[{++--;&&||^'.indexOf(token.value) >= 0) ||
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
        if (isWhiteSpace(ch) || isLineTerminator(ch) || isPunctuator(ch)) // "'?
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
        if ('0123456789abcdefABCDEF.xXeE+-'.indexOf(ch) < 0) {
            break;
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

}());
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

var LOCAL_EASY_XDM = true;

/**
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
(function(N,d,p,K,k,H){var b=this;var n=Math.floor(Math.random()*10000);var q=Function.prototype;var Q=/^((http.?:)\/\/([^:\/\s]+)(:\d+)*)/;var R=/[\-\w]+\/\.\.\//;var F=/([^:])\/\//g;var I="";var o={};var M=N.easyXDM;var U="easyXDM_";var E;var y=false;var i;var h;function C(X,Z){var Y=typeof X[Z];return Y=="function"||(!!(Y=="object"&&X[Z]))||Y=="unknown"}function u(X,Y){return !!(typeof(X[Y])=="object"&&X[Y])}function r(X){return Object.prototype.toString.call(X)==="[object Array]"}function c(){try{var X=new ActiveXObject("ShockwaveFlash.ShockwaveFlash");i=Array.prototype.slice.call(X.GetVariable("$version").match(/(\d+),(\d+),(\d+),(\d+)/),1);h=parseInt(i[0],10)>9&&parseInt(i[1],10)>0;X=null;return true}catch(Y){return false}}var v,x;if(C(N,"addEventListener")){v=function(Z,X,Y){Z.addEventListener(X,Y,false)};x=function(Z,X,Y){Z.removeEventListener(X,Y,false)}}else{if(C(N,"attachEvent")){v=function(X,Z,Y){X.attachEvent("on"+Z,Y)};x=function(X,Z,Y){X.detachEvent("on"+Z,Y)}}else{throw new Error("Browser not supported")}}var W=false,J=[],L;if("readyState" in d){L=d.readyState;W=L=="complete"||(~navigator.userAgent.indexOf("AppleWebKit/")&&(L=="loaded"||L=="interactive"))}else{W=!!d.body}function s(){if(W){return}W=true;for(var X=0;X<J.length;X++){J[X]()}J.length=0}if(!W){if(C(N,"addEventListener")){v(d,"DOMContentLoaded",s)}else{v(d,"readystatechange",function(){if(d.readyState=="complete"){s()}});if(d.documentElement.doScroll&&N===top){var g=function(){if(W){return}try{d.documentElement.doScroll("left")}catch(X){K(g,1);return}s()};g()}}v(N,"load",s)}function G(Y,X){if(W){Y.call(X);return}J.push(function(){Y.call(X)})}function m(){var Z=parent;if(I!==""){for(var X=0,Y=I.split(".");X<Y.length;X++){Z=Z[Y[X]]}}return Z.easyXDM}function e(X){N.easyXDM=M;I=X;if(I){U="easyXDM_"+I.replace(".","_")+"_"}return o}function z(X){return X.match(Q)[3]}function f(X){return X.match(Q)[4]||""}function j(Z){var X=Z.toLowerCase().match(Q);var aa=X[2],ab=X[3],Y=X[4]||"";if((aa=="http:"&&Y==":80")||(aa=="https:"&&Y==":443")){Y=""}return aa+"//"+ab+Y}function B(X){X=X.replace(F,"$1/");if(!X.match(/^(http||https):\/\//)){var Y=(X.substring(0,1)==="/")?"":p.pathname;if(Y.substring(Y.length-1)!=="/"){Y=Y.substring(0,Y.lastIndexOf("/")+1)}X=p.protocol+"//"+p.host+Y+X}while(R.test(X)){X=X.replace(R,"")}return X}function P(X,aa){var ac="",Z=X.indexOf("#");if(Z!==-1){ac=X.substring(Z);X=X.substring(0,Z)}var ab=[];for(var Y in aa){if(aa.hasOwnProperty(Y)){ab.push(Y+"="+H(aa[Y]))}}return X+(y?"#":(X.indexOf("?")==-1?"?":"&"))+ab.join("&")+ac}var S=(function(X){X=X.substring(1).split("&");var Z={},aa,Y=X.length;while(Y--){aa=X[Y].split("=");Z[aa[0]]=k(aa[1])}return Z}(/xdm_e=/.test(p.search)?p.search:p.hash));function t(X){return typeof X==="undefined"}var O=function(){var Y={};var Z={a:[1,2,3]},X='{"a":[1,2,3]}';if(typeof JSON!="undefined"&&typeof JSON.stringify==="function"&&JSON.stringify(Z).replace((/\s/g),"")===X){return JSON}if(Object.toJSON){if(Object.toJSON(Z).replace((/\s/g),"")===X){Y.stringify=Object.toJSON}}if(typeof String.prototype.evalJSON==="function"){Z=X.evalJSON();if(Z.a&&Z.a.length===3&&Z.a[2]===3){Y.parse=function(aa){return aa.evalJSON()}}}if(Y.stringify&&Y.parse){O=function(){return Y};return Y}return null};function T(X,Y,Z){var ab;for(var aa in Y){if(Y.hasOwnProperty(aa)){if(aa in X){ab=Y[aa];if(typeof ab==="object"){T(X[aa],ab,Z)}else{if(!Z){X[aa]=Y[aa]}}}else{X[aa]=Y[aa]}}}return X}function a(){var Y=d.body.appendChild(d.createElement("form")),X=Y.appendChild(d.createElement("input"));X.name=U+"TEST"+n;E=X!==Y.elements[X.name];d.body.removeChild(Y)}function A(X){if(t(E)){a()}var Z;if(E){Z=d.createElement('<iframe name="'+X.props.name+'"/>')}else{Z=d.createElement("IFRAME");Z.name=X.props.name}Z.id=Z.name=X.props.name;delete X.props.name;if(X.onLoad){v(Z,"load",X.onLoad)}if(typeof X.container=="string"){X.container=d.getElementById(X.container)}if(!X.container){T(Z.style,{position:"absolute",top:"-2000px"});X.container=d.body}var Y=X.props.src;delete X.props.src;T(Z,X.props);Z.border=Z.frameBorder=0;Z.allowTransparency=true;X.container.appendChild(Z);Z.src=Y;X.props.src=Y;return Z}function V(aa,Z){if(typeof aa=="string"){aa=[aa]}var Y,X=aa.length;while(X--){Y=aa[X];Y=new RegExp(Y.substr(0,1)=="^"?Y:("^"+Y.replace(/(\*)/g,".$1").replace(/\?/g,".")+"$"));if(Y.test(Z)){return true}}return false}function l(Z){var ae=Z.protocol,Y;Z.isHost=Z.isHost||t(S.xdm_p);y=Z.hash||false;if(!Z.props){Z.props={}}if(!Z.isHost){Z.channel=S.xdm_c;Z.secret=S.xdm_s;Z.remote=S.xdm_e;ae=S.xdm_p;if(Z.acl&&!V(Z.acl,Z.remote)){throw new Error("Access denied for "+Z.remote)}}else{Z.remote=B(Z.remote);Z.channel=Z.channel||"default"+n++;Z.secret=Math.random().toString(16).substring(2);if(t(ae)){if(j(p.href)==j(Z.remote)){ae="4"}else{if(C(N,"postMessage")||C(d,"postMessage")){ae="1"}else{if(Z.swf&&C(N,"ActiveXObject")&&c()){ae="6"}else{if(navigator.product==="Gecko"&&"frameElement" in N&&navigator.userAgent.indexOf("WebKit")==-1){ae="5"}else{if(Z.remoteHelper){Z.remoteHelper=B(Z.remoteHelper);ae="2"}else{ae="0"}}}}}}}Z.protocol=ae;switch(ae){case"0":T(Z,{interval:100,delay:2000,useResize:true,useParent:false,usePolling:false},true);if(Z.isHost){if(!Z.local){var ac=p.protocol+"//"+p.host,X=d.body.getElementsByTagName("img"),ad;var aa=X.length;while(aa--){ad=X[aa];if(ad.src.substring(0,ac.length)===ac){Z.local=ad.src;break}}if(!Z.local){Z.local=N}}var ab={xdm_c:Z.channel,xdm_p:0};if(Z.local===N){Z.usePolling=true;Z.useParent=true;Z.local=p.protocol+"//"+p.host+p.pathname+p.search;ab.xdm_e=Z.local;ab.xdm_pa=1}else{ab.xdm_e=B(Z.local)}if(Z.container){Z.useResize=false;ab.xdm_po=1}Z.remote=P(Z.remote,ab)}else{T(Z,{channel:S.xdm_c,remote:S.xdm_e,useParent:!t(S.xdm_pa),usePolling:!t(S.xdm_po),useResize:Z.useParent?false:Z.useResize})}Y=[new o.stack.HashTransport(Z),new o.stack.ReliableBehavior({}),new o.stack.QueueBehavior({encode:true,maxLength:4000-Z.remote.length}),new o.stack.VerifyBehavior({initiate:Z.isHost})];break;case"1":Y=[new o.stack.PostMessageTransport(Z)];break;case"2":Y=[new o.stack.NameTransport(Z),new o.stack.QueueBehavior(),new o.stack.VerifyBehavior({initiate:Z.isHost})];break;case"3":Y=[new o.stack.NixTransport(Z)];break;case"4":Y=[new o.stack.SameOriginTransport(Z)];break;case"5":Y=[new o.stack.FrameElementTransport(Z)];break;case"6":if(!i){c()}Y=[new o.stack.FlashTransport(Z)];break}Y.push(new o.stack.QueueBehavior({lazy:Z.lazy,remove:true}));return Y}function D(aa){var ab,Z={incoming:function(ad,ac){this.up.incoming(ad,ac)},outgoing:function(ac,ad){this.down.outgoing(ac,ad)},callback:function(ac){this.up.callback(ac)},init:function(){this.down.init()},destroy:function(){this.down.destroy()}};for(var Y=0,X=aa.length;Y<X;Y++){ab=aa[Y];T(ab,Z,true);if(Y!==0){ab.down=aa[Y-1]}if(Y!==X-1){ab.up=aa[Y+1]}}return ab}function w(X){X.up.down=X.down;X.down.up=X.up;X.up=X.down=null}T(o,{version:"2.4.15.118",query:S,stack:{},apply:T,getJSONObject:O,whenReady:G,noConflict:e});o.DomHelper={on:v,un:x,requiresJSON:function(X){if(!u(N,"JSON")){d.write('<script type="text/javascript" src="'+X+'"><\/script>')}}};(function(){var X={};o.Fn={set:function(Y,Z){X[Y]=Z},get:function(Z,Y){var aa=X[Z];if(Y){delete X[Z]}return aa}}}());o.Socket=function(Y){var X=D(l(Y).concat([{incoming:function(ab,aa){Y.onMessage(ab,aa)},callback:function(aa){if(Y.onReady){Y.onReady(aa)}}}])),Z=j(Y.remote);this.origin=j(Y.remote);this.destroy=function(){X.destroy()};this.postMessage=function(aa){X.outgoing(aa,Z)};X.init()};o.Rpc=function(Z,Y){if(Y.local){for(var ab in Y.local){if(Y.local.hasOwnProperty(ab)){var aa=Y.local[ab];if(typeof aa==="function"){Y.local[ab]={method:aa}}}}}var X=D(l(Z).concat([new o.stack.RpcBehavior(this,Y),{callback:function(ac){if(Z.onReady){Z.onReady(ac)}}}]));this.origin=j(Z.remote);this.destroy=function(){X.destroy()};X.init()};o.stack.SameOriginTransport=function(Y){var Z,ab,aa,X;return(Z={outgoing:function(ad,ae,ac){aa(ad);if(ac){ac()}},destroy:function(){if(ab){ab.parentNode.removeChild(ab);ab=null}},onDOMReady:function(){X=j(Y.remote);if(Y.isHost){T(Y.props,{src:P(Y.remote,{xdm_e:p.protocol+"//"+p.host+p.pathname,xdm_c:Y.channel,xdm_p:4}),name:U+Y.channel+"_provider"});ab=A(Y);o.Fn.set(Y.channel,function(ac){aa=ac;K(function(){Z.up.callback(true)},0);return function(ad){Z.up.incoming(ad,X)}})}else{aa=m().Fn.get(Y.channel,true)(function(ac){Z.up.incoming(ac,X)});K(function(){Z.up.callback(true)},0)}},init:function(){G(Z.onDOMReady,Z)}})};o.stack.FlashTransport=function(aa){var ac,X,ab,ad,Y,ae;function af(ah,ag){K(function(){ac.up.incoming(ah,ad)},0)}function Z(ah){var ag=aa.swf+"?host="+aa.isHost;var aj="easyXDM_swf_"+Math.floor(Math.random()*10000);o.Fn.set("flash_loaded"+ah.replace(/[\-.]/g,"_"),function(){o.stack.FlashTransport[ah].swf=Y=ae.firstChild;var ak=o.stack.FlashTransport[ah].queue;for(var al=0;al<ak.length;al++){ak[al]()}ak.length=0});if(aa.swfContainer){ae=(typeof aa.swfContainer=="string")?d.getElementById(aa.swfContainer):aa.swfContainer}else{ae=d.createElement("div");T(ae.style,h&&aa.swfNoThrottle?{height:"20px",width:"20px",position:"fixed",right:0,top:0}:{height:"1px",width:"1px",position:"absolute",overflow:"hidden",right:0,top:0});d.body.appendChild(ae)}var ai="callback=flash_loaded"+ah.replace(/[\-.]/g,"_")+"&proto="+b.location.protocol+"&domain="+z(b.location.href)+"&port="+f(b.location.href)+"&ns="+I;ae.innerHTML="<object height='20' width='20' type='application/x-shockwave-flash' id='"+aj+"' data='"+ag+"'><param name='allowScriptAccess' value='always'></param><param name='wmode' value='transparent'><param name='movie' value='"+ag+"'></param><param name='flashvars' value='"+ai+"'></param><embed type='application/x-shockwave-flash' FlashVars='"+ai+"' allowScriptAccess='always' wmode='transparent' src='"+ag+"' height='1' width='1'></embed></object>"}return(ac={outgoing:function(ah,ai,ag){Y.postMessage(aa.channel,ah.toString());if(ag){ag()}},destroy:function(){try{Y.destroyChannel(aa.channel)}catch(ag){}Y=null;if(X){X.parentNode.removeChild(X);X=null}},onDOMReady:function(){ad=aa.remote;o.Fn.set("flash_"+aa.channel+"_init",function(){K(function(){ac.up.callback(true)})});o.Fn.set("flash_"+aa.channel+"_onMessage",af);aa.swf=B(aa.swf);var ah=z(aa.swf);var ag=function(){o.stack.FlashTransport[ah].init=true;Y=o.stack.FlashTransport[ah].swf;Y.createChannel(aa.channel,aa.secret,j(aa.remote),aa.isHost);if(aa.isHost){if(h&&aa.swfNoThrottle){T(aa.props,{position:"fixed",right:0,top:0,height:"20px",width:"20px"})}T(aa.props,{src:P(aa.remote,{xdm_e:j(p.href),xdm_c:aa.channel,xdm_p:6,xdm_s:aa.secret}),name:U+aa.channel+"_provider"});X=A(aa)}};if(o.stack.FlashTransport[ah]&&o.stack.FlashTransport[ah].init){ag()}else{if(!o.stack.FlashTransport[ah]){o.stack.FlashTransport[ah]={queue:[ag]};Z(ah)}else{o.stack.FlashTransport[ah].queue.push(ag)}}},init:function(){G(ac.onDOMReady,ac)}})};o.stack.PostMessageTransport=function(aa){var ac,ad,Y,Z;function X(ae){if(ae.origin){return j(ae.origin)}if(ae.uri){return j(ae.uri)}if(ae.domain){return p.protocol+"//"+ae.domain}throw"Unable to retrieve the origin of the event"}function ab(af){var ae=X(af);if(ae==Z&&af.data.substring(0,aa.channel.length+1)==aa.channel+" "){ac.up.incoming(af.data.substring(aa.channel.length+1),ae)}}return(ac={outgoing:function(af,ag,ae){Y.postMessage(aa.channel+" "+af,ag||Z);if(ae){ae()}},destroy:function(){x(N,"message",ab);if(ad){Y=null;ad.parentNode.removeChild(ad);ad=null}},onDOMReady:function(){Z=j(aa.remote);if(aa.isHost){var ae=function(af){if(af.data==aa.channel+"-ready"){Y=("postMessage" in ad.contentWindow)?ad.contentWindow:ad.contentWindow.document;x(N,"message",ae);v(N,"message",ab);K(function(){ac.up.callback(true)},0)}};v(N,"message",ae);T(aa.props,{src:P(aa.remote,{xdm_e:j(p.href),xdm_c:aa.channel,xdm_p:1}),name:U+aa.channel+"_provider"});ad=A(aa)}else{v(N,"message",ab);Y=("postMessage" in N.parent)?N.parent:N.parent.document;Y.postMessage(aa.channel+"-ready",Z);K(function(){ac.up.callback(true)},0)}},init:function(){G(ac.onDOMReady,ac)}})};o.stack.FrameElementTransport=function(Y){var Z,ab,aa,X;return(Z={outgoing:function(ad,ae,ac){aa.call(this,ad);if(ac){ac()}},destroy:function(){if(ab){ab.parentNode.removeChild(ab);ab=null}},onDOMReady:function(){X=j(Y.remote);if(Y.isHost){T(Y.props,{src:P(Y.remote,{xdm_e:j(p.href),xdm_c:Y.channel,xdm_p:5}),name:U+Y.channel+"_provider"});ab=A(Y);ab.fn=function(ac){delete ab.fn;aa=ac;K(function(){Z.up.callback(true)},0);return function(ad){Z.up.incoming(ad,X)}}}else{if(d.referrer&&j(d.referrer)!=S.xdm_e){N.top.location=S.xdm_e}aa=N.frameElement.fn(function(ac){Z.up.incoming(ac,X)});Z.up.callback(true)}},init:function(){G(Z.onDOMReady,Z)}})};o.stack.NameTransport=function(ab){var ac;var ae,ai,aa,ag,ah,Y,X;function af(al){var ak=ab.remoteHelper+(ae?"#_3":"#_2")+ab.channel;ai.contentWindow.sendMessage(al,ak)}function ad(){if(ae){if(++ag===2||!ae){ac.up.callback(true)}}else{af("ready");ac.up.callback(true)}}function aj(ak){ac.up.incoming(ak,Y)}function Z(){if(ah){K(function(){ah(true)},0)}}return(ac={outgoing:function(al,am,ak){ah=ak;af(al)},destroy:function(){ai.parentNode.removeChild(ai);ai=null;if(ae){aa.parentNode.removeChild(aa);aa=null}},onDOMReady:function(){ae=ab.isHost;ag=0;Y=j(ab.remote);ab.local=B(ab.local);if(ae){o.Fn.set(ab.channel,function(al){if(ae&&al==="ready"){o.Fn.set(ab.channel,aj);ad()}});X=P(ab.remote,{xdm_e:ab.local,xdm_c:ab.channel,xdm_p:2});T(ab.props,{src:X+"#"+ab.channel,name:U+ab.channel+"_provider"});aa=A(ab)}else{ab.remoteHelper=ab.remote;o.Fn.set(ab.channel,aj)}ai=A({props:{src:ab.local+"#_4"+ab.channel},onLoad:function ak(){var al=ai||this;x(al,"load",ak);o.Fn.set(ab.channel+"_load",Z);(function am(){if(typeof al.contentWindow.sendMessage=="function"){ad()}else{K(am,50)}}())}})},init:function(){G(ac.onDOMReady,ac)}})};o.stack.HashTransport=function(Z){var ac;var ah=this,af,aa,X,ad,am,ab,al;var ag,Y;function ak(ao){if(!al){return}var an=Z.remote+"#"+(am++)+"_"+ao;((af||!ag)?al.contentWindow:al).location=an}function ae(an){ad=an;ac.up.incoming(ad.substring(ad.indexOf("_")+1),Y)}function aj(){if(!ab){return}var an=ab.location.href,ap="",ao=an.indexOf("#");if(ao!=-1){ap=an.substring(ao)}if(ap&&ap!=ad){ae(ap)}}function ai(){aa=setInterval(aj,X)}return(ac={outgoing:function(an,ao){ak(an)},destroy:function(){N.clearInterval(aa);if(af||!ag){al.parentNode.removeChild(al)}al=null},onDOMReady:function(){af=Z.isHost;X=Z.interval;ad="#"+Z.channel;am=0;ag=Z.useParent;Y=j(Z.remote);if(af){Z.props={src:Z.remote,name:U+Z.channel+"_provider"};if(ag){Z.onLoad=function(){ab=N;ai();ac.up.callback(true)}}else{var ap=0,an=Z.delay/50;(function ao(){if(++ap>an){throw new Error("Unable to reference listenerwindow")}try{ab=al.contentWindow.frames[U+Z.channel+"_consumer"]}catch(aq){}if(ab){ai();ac.up.callback(true)}else{K(ao,50)}}())}al=A(Z)}else{ab=N;ai();if(ag){al=parent;ac.up.callback(true)}else{T(Z,{props:{src:Z.remote+"#"+Z.channel+new Date(),name:U+Z.channel+"_consumer"},onLoad:function(){ac.up.callback(true)}});al=A(Z)}}},init:function(){G(ac.onDOMReady,ac)}})};o.stack.ReliableBehavior=function(Y){var aa,ac;var ab=0,X=0,Z="";return(aa={incoming:function(af,ad){var ae=af.indexOf("_"),ag=af.substring(0,ae).split(",");af=af.substring(ae+1);if(ag[0]==ab){Z="";if(ac){ac(true)}}if(af.length>0){aa.down.outgoing(ag[1]+","+ab+"_"+Z,ad);if(X!=ag[1]){X=ag[1];aa.up.incoming(af,ad)}}},outgoing:function(af,ad,ae){Z=af;ac=ae;aa.down.outgoing(X+","+(++ab)+"_"+af,ad)}})};o.stack.QueueBehavior=function(Z){var ac,ad=[],ag=true,aa="",af,X=0,Y=false,ab=false;function ae(){if(Z.remove&&ad.length===0){w(ac);return}if(ag||ad.length===0||af){return}ag=true;var ah=ad.shift();ac.down.outgoing(ah.data,ah.origin,function(ai){ag=false;if(ah.callback){K(function(){ah.callback(ai)},0)}ae()})}return(ac={init:function(){if(t(Z)){Z={}}if(Z.maxLength){X=Z.maxLength;ab=true}if(Z.lazy){Y=true}else{ac.down.init()}},callback:function(ai){ag=false;var ah=ac.up;ae();ah.callback(ai)},incoming:function(ak,ai){if(ab){var aj=ak.indexOf("_"),ah=parseInt(ak.substring(0,aj),10);aa+=ak.substring(aj+1);if(ah===0){if(Z.encode){aa=k(aa)}ac.up.incoming(aa,ai);aa=""}}else{ac.up.incoming(ak,ai)}},outgoing:function(al,ai,ak){if(Z.encode){al=H(al)}var ah=[],aj;if(ab){while(al.length!==0){aj=al.substring(0,X);al=al.substring(aj.length);ah.push(aj)}while((aj=ah.shift())){ad.push({data:ah.length+"_"+aj,origin:ai,callback:ah.length===0?ak:null})}}else{ad.push({data:al,origin:ai,callback:ak})}if(Y){ac.down.init()}else{ae()}},destroy:function(){af=true;ac.down.destroy()}})};o.stack.VerifyBehavior=function(ab){var ac,aa,Y,Z=false;function X(){aa=Math.random().toString(16).substring(2);ac.down.outgoing(aa)}return(ac={incoming:function(af,ad){var ae=af.indexOf("_");if(ae===-1){if(af===aa){ac.up.callback(true)}else{if(!Y){Y=af;if(!ab.initiate){X()}ac.down.outgoing(af)}}}else{if(af.substring(0,ae)===Y){ac.up.incoming(af.substring(ae+1),ad)}}},outgoing:function(af,ad,ae){ac.down.outgoing(aa+"_"+af,ad,ae)},callback:function(ad){if(ab.initiate){X()}}})};o.stack.RpcBehavior=function(ad,Y){var aa,af=Y.serializer||O();var ae=0,ac={};function X(ag){ag.jsonrpc="2.0";aa.down.outgoing(af.stringify(ag))}function ab(ag,ai){var ah=Array.prototype.slice;return function(){var aj=arguments.length,al,ak={method:ai};if(aj>0&&typeof arguments[aj-1]==="function"){if(aj>1&&typeof arguments[aj-2]==="function"){al={success:arguments[aj-2],error:arguments[aj-1]};ak.params=ah.call(arguments,0,aj-2)}else{al={success:arguments[aj-1]};ak.params=ah.call(arguments,0,aj-1)}ac[""+(++ae)]=al;ak.id=ae}else{ak.params=ah.call(arguments,0)}if(ag.namedParams&&ak.params.length===1){ak.params=ak.params[0]}X(ak)}}function Z(an,am,ai,al){if(!ai){if(am){X({id:am,error:{code:-32601,message:"Procedure not found."}})}return}var ak,ah;if(am){ak=function(ao){ak=q;X({id:am,result:ao})};ah=function(ao,ap){ah=q;var aq={id:am,error:{code:-32099,message:ao}};if(ap){aq.error.data=ap}X(aq)}}else{ak=ah=q}if(!r(al)){al=[al]}try{var ag=ai.method.apply(ai.scope,al.concat([ak,ah]));if(!t(ag)){ak(ag)}}catch(aj){ah(aj.message)}}return(aa={incoming:function(ah,ag){var ai=af.parse(ah);if(ai.method){if(Y.handle){Y.handle(ai,X)}else{Z(ai.method,ai.id,Y.local[ai.method],ai.params)}}else{var aj=ac[ai.id];if(ai.error){if(aj.error){aj.error(ai.error)}}else{if(aj.success){aj.success(ai.result)}}delete ac[ai.id]}},init:function(){if(Y.remote){for(var ag in Y.remote){if(Y.remote.hasOwnProperty(ag)){ad[ag]=ab(Y.remote[ag],ag)}}}aa.down.init()},destroy:function(){for(var ag in Y.remote){if(Y.remote.hasOwnProperty(ag)&&ad.hasOwnProperty(ag)){delete ad[ag]}}aa.down.destroy()}})};b.easyXDM=o})(window,document,location,window.setTimeout,decodeURIComponent,encodeURIComponent);
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
/*jshint unused:false */
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
    Class.js instance
    @type {object}
    @global
 */
var Class = this.Class.noConflict();
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
var Analyzer;
(function () {
  var AsStatic = Class.extend(function () {
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
        var strippedModuleList = [];
        var moduleId;
        for (var i = 0, len = modules.length; i < len; i++) {
          moduleId = modules[i];
          if (moduleId !== 'require' && moduleId !== 'exports' && moduleId !== 'module') {
            strippedModuleList.push(moduleId);
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
        var result = LinkJS.parse(file);
        return result.requires;
      }
    };
  });
  Analyzer = new AsStatic();
})();

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
**/
var Communicator;
(function () {
  var AsStatic = Class.extend(function () {
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
      return lscache.set(url, contents, userConfig.fileExpires);
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
      return lscache.get(url);
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
      if (statusCode === 200) {
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

        var cachedResults = readFromCache(url);
        if (cachedResults) {
          debugLog('Communicator (' + url + ')', 'retireved from cache. length: ' + cachedResults.length);
          callback(cachedResults);
          return;
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
})();
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
(function () {

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
    }
    catch (e) {
      try {
        scr.innerHTML = code;
      }
      catch (ee) {
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
    context.setTimeout(function () {
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

  /**
   * on error, this offset represents the delta between actual
   * errors and the reported line
   * @private
   * @type {int}
   */
  var onErrorOffset = (IS_GK) ? -3 : 0;

  /**
   * the old onerror object for restoring
   * @private
   * @type {*}
   */
  var initOldError = context.onerror;

  // capture document head
  try { docHead = document.getElementsByTagName('head')[0]; }
  catch (e) { docHead = false; }

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
    var offset = parseInt(onErrorOffset, 10);
    if (typeof(e.lineNumber) !== 'undefined' && e.lineNumber !== null) {
      return parseInt(e.lineNumber, 10) + offset;
    }
    if (typeof(e.line) !== 'undefined' && e.line !== null) {
      return parseInt(e.line, 10) + offset;
    }
    if (e.stack) {
      lines = e.stack.split('\n');
      phrases = lines[1].split(':');
      return parseInt(phrases[phrases.length - 2], 10) + offset;
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
    var sourceString = IS_IE ? '' : '//@ sourceURL=' + options.url;
    var result;

    options = {
      moduleId: options.moduleId || null,
      functionId: options.functionId || null,
      preamble: options.preamble || '',
      preambleLength: options.preamble.split('\n').length + 1,
      epilogue: options.epilogue || '',
      epilogueLength: options.epilogue.split('\n').length + 1,
      originalCode: options.originalCode || code,
      url: options.url || null
    };

    // add source string in sourcemap compatible browsers
    code = [code, sourceString].join('\n');

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
    var tempErrorHandler = function (err, where, line, type) {
      var actualErrorLine =  line - options.preambleLength;
      var originalCodeLength = options.originalCode.split('\n').length;
      var message = '';

      if (type === 'runtime') {
        message = 'Runtime error in ' + options.moduleId + ' (' + options.url + ') on line ' + actualErrorLine + ':\n  ' + err;
      }
      else {
        // case: parse
        // end of input test
        actualErrorLine = (actualErrorLine > originalCodeLength) ? originalCodeLength : actualErrorLine;
        message = 'Parsing error in ' + options.moduleId + ' (' + options.url + ') on line ' + actualErrorLine + ':\n  ' + err;
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
        var toExec = code.replace(/([\w\W]+?)=([\w\W]*\})[\w\W]*?$/, '$1 = ($2)();');
        var relativeE;
        toExec = [toExec, sourceString].join('\n');
        if (!context.Inject.INTERNAL.execute[options.functionId]) {
          // there is nothing to run, so there must have been an uncaught
          // syntax error (firefox).
          try {
            try { eval('+\n//@ sourceURL=Inject-Executor-line.js'); } catch (ee) { relativeE = ee; }
            eval(toExec);
          }
          catch (e) {
            if (e.lineNumber && relativeE.lineNumber) {
              e.lineNumber = e.lineNumber - relativeE.lineNumber + 1;
            }
            else {
              e.lineNumber = getLineNumberFromException(e);
            }
            tempErrorHandler(e.message, null, e.lineNumber, 'parse');
          }
        }
        else {
          // again, we are creating a "relativeE" to capture the eval line
          // this allows us to get accurate line numbers in firefox
          try {
            eval('+\n//@ sourceURL=Inject-Executor-line.js');
          }
          catch (ee) {
            relativeE = ee;
          }
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
            tempErrorHandler(result.error.message, null, result.error.lineNumber, 'runtime');
          }
        }
      }
      else {
        // just run it. Try/catch will capture exceptions and put them
        // into result.error for us from commonjs harness
        result = context.Inject.INTERNAL.execute[options.functionId]();
        if (result.error) {
          tempErrorHandler(result.error.message, null, getLineNumberFromException(result.error), 'runtime');
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
    if (context.Inject.INTERNAL.execute[options.functionId]) {
      delete context.Inject.INTERNAL.execute[options.functionId];
    }

    // return the results
    return result;
  }

  var AsStatic = Class.extend(function () {
    var functionCount = 0;
    return {
      /**
       * Create the executor and initialize its caches
       * @constructs Executor
       */
      init: function () {
        this.clearCaches();
      },

      /**
       * Clear all the caches for the executor
       * @method Executor.clearCaches
       * @public
       */
      clearCaches: function () {
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
      defineExecutingModuleAs: function (moduleId, path) {
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
      undefineExecutingModule: function () {
        return this.anonymousAMDStack.pop();
      },

      /**
       * Get the current executing AMD module
       * @method Executor.getCurrentExecutingAMD
       * @public
       * @returns {object} the id and path of the current module
       */
      getCurrentExecutingAMD: function () {
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
      assignModule: function (parentName, moduleName, path, exports) {
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
      getAssignedModule: function (parentName, moduleName) {
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
      runTree: function (root, files, callback) {
        // do a post-order traverse of files for execution
        var returns = [];
        root.postOrder(function (node) {
          if (!node.getValue().name) {
            return; // root node
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
       * Create a module if it doesn't exist, and store it locally
       * @method Executor.createModule
       * @param {string} moduleId - the module identifier
       * @param {string} path - the module's proposed URL
       * @public
       * @returns {Object} - a module object representation
       */
      createModule: function (moduleId, path) {
        var module;
        if (!this.cache[moduleId]) {
          module = {};
          module.id = moduleId || null;
          module.uri = path || null;
          module.exports = {};
          module.error = null;
          module.setExports = function (xobj) {
            for (var name in module.exports) {
              debugLog('cannot setExports when exports have already been set. setExports skipped');
              return;
            }
            switch (typeof(xobj)) {
            case 'object':
              // objects are enumerated and added
              for (var name in xobj) {
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
      isModuleDefined: function (moduleId) {
        return this.defined[moduleId];
      },

      /**
       * Flag a module as defined AMD style
       * @method Executor.flagModuleAsDefined
       * @param {string} moduleId - the module ID
       * @public
       */
      flagModuleAsDefined: function (moduleId) {
        this.defined[moduleId] = true;
      },

      /**
       * Flag a module as broken
       * @method Executor.flagModuleAsBroken
       * @param {string} moduleId - the module ID
       * @public
       */
      flagModuleAsBroken: function (moduleId) {
        this.broken[moduleId] = true;
      },

      /**
       * Flag a module as circular
       * @method Executor.flagModuleAsCircular
       * @param {string} moduleId - the module ID
       * @public
       */
      flagModuleAsCircular: function (moduleId) {
        this.circular[moduleId] = true;
      },

      /**
       * returns if the module is circular or not
       * @method Executor.isModuleCircular
       * @param {string} moduleId - the module ID
       * @public
       * @returns {boolean} true if the module is circular
       */
      isModuleCircular: function (moduleId) {
        return this.circular[moduleId];
      },

      /**
       * Get the module matching the specified Identifier
       * @method Executor.getModule
       * @param {string} moduleId - the module ID
       * @public
       * @returns {object} the module at the identifier
       */
      getModule: function (moduleId) {
        if (this.broken[moduleId] && this.broken.hasOwnProperty(moduleId)) {
          throw new Error('module ' + moduleId + ' failed to load successfully');
        }
        return this.cache[moduleId] || null;
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
      runModule: function (moduleId, code, path) {
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
          return text.replace(/__MODULE_ID__/g, moduleId)
                     .replace(/__MODULE_URI__/g, path)
                     .replace(/__FUNCTION_ID__/g, functionId)
                     .replace(/__INJECT_NS__/g, NAMESPACE);
        }

        var header = swapUnderscoreVars(commonJSHeader);
        var footer = swapUnderscoreVars(commonJSFooter);
        var runCommand = ([header, ';', code, footer]).join('\n');
        var result;

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
          context[NAMESPACE].clearCache();
          throw result.error;
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
 * The InjectCore is the main configuration point for Inject.
 * It is able to create require() and define() methods within a
 * path context, as well as assign configuration for the
 * various options.
 * @file
**/
var InjectCore;
(function () {
  var AsStatic = Class.extend(function () {
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
          var resolvedId = RulesEngine.resolveIdentifier(identifier, id);
          var resolvedPath = RulesEngine.resolveUrl(resolvedId, path, true);
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
       * @public
       * @returns a function adhearing to the AMD define() method
       */
      createDefine: function (id, path) {
        var req = new RequireContext(id, path);
        var define = proxy(req.define, req);
        define.amd = {};
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
var RequireContext = Class.extend(function () {
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
        identifier = RulesEngine.resolveIdentifier(moduleIdOrList, this.getId());
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
      var strippedModules = Analyzer.stripBuiltins(moduleIdOrList);
      this.ensure(strippedModules, proxy(function (localRequire) {
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
      for (var i = 0, len = args.length; i < len; i++) {
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
      for (var i = 0, len = key.length; i < len; i++) {
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
      for (var i = 0, len = dependencies.length; i < len; i++) {
        if (BUILTINS[dependencies[i]]) {
          // was a builtin, skip
          resolvedDependencyList.push(dependencies[i]);
          continue;
        }
        // TODO: amd dependencies are resolved FIRST against their current ID
        // then against the module Root (huge deviation from CommonJS which uses
        // the filepaths)
        tempModuleId = RulesEngine.resolveIdentifier(dependencies[i], this.getId());
        resolvedDependencyList.push(tempModuleId);
        if (!Executor.isModuleCircular(tempModuleId) && !Executor.isModuleDefined(tempModuleId)) {
          remainingDependencies.push(dependencies[i]);
        }
      }

      // handle anonymous modules
      if (!id) {
        id = Executor.getCurrentExecutingAMD().id;
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
      this.require(remainingDependencies, proxy(function (require) {
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

// jshint
RequireContext = RequireContext;
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

var RulesEngine;
(function () {

  /**
   * the collection of rules
   * @private
   * @type {Array}
   */
  var rules = [];

  /**
   * have the rules been added to since last sorted
   * @private
   * @type {boolean}
   */
  var rulesIsDirty = false;

  /**
   * sort the rules table based on their "weight" property
   * @method RulesEngine.sortRulesTable
   * @private
   */
  function sortRulesTable() {
    rules.sort(function (a, b) {
      return b.weight - a.weight;
    });
    rulesIsDirty = false;
  }

  /**
   * convert a function to a pointcut string
   * @method RulesEngine.functionToPointcut
   * @param {Function} fn - the function to convert
   * @private
   * @returns {String} the internal body of the function
   */
  function functionToPointcut(fn) {
    return fn.toString().replace(FUNCTION_BODY_REGEX, '$1');
  }

  var AsStatic = Class.extend(function () {
    return {
      /**
       * Create a RulesEngine Object
       * @constructs RulesEngine
       */
      init: function () {
        this.pointcuts = {};
      },

      /**
       * Resolve an identifier after applying all rules
       * @method RulesEngine.resolveIdentifier
       * @param {String} identifier - the identifier to resolve
       * @param {String} relativeTo - a base path for relative identifiers
       * @public
       * @returns {String} the resolved identifier
       */
      resolveIdentifier: function (identifier, relativeTo) {
        if (!relativeTo) {
          relativeTo = '';
        }

        if (identifier.indexOf('.') !== 0) {
          relativeTo = '';
        }

        // basedir
        if (relativeTo) {
          relativeTo = relativeTo.split('/');
          relativeTo.pop();
          relativeTo = relativeTo.join('/');
        }

        if (identifier.indexOf('/') === 0) {
          return identifier;
        }

        identifier = this.computeRelativePath(identifier, relativeTo);

        if (identifier.indexOf('/') === 0) {
          identifier = identifier.split('/');
          identifier.shift();
          identifier = identifier.join('/');
        }

        return identifier;
      },

      /**
       * resolve a URL relative to a base path
       * @method RulesEngine.resolveUrl
       * @param {String} path - the path to resolve
       * @param {String} relativeTo - a base path for relative URLs
       * @param {Boolean} noSuffix - do not use a suffix for this resolution
       * @public
       * @returns {String} a resolved URL
       */
      resolveUrl: function (path, relativeTo, noSuffix) {
        var resolvedUrl;

        // if no module root, freak out
        if (!userConfig.moduleRoot) {
          throw new Error('module root needs to be defined for resolving URLs');
        }

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
        if (ABSOLUTE_PATH_REGEX.test(path)) {
          return path;
        }

        // Apply our rules to the path in progress
        var result = this.applyRules(path);
        path = result.resolved;

        // exit early on resolved http URL
        if (ABSOLUTE_PATH_REGEX.test(path)) {
          // store pointcuts based on the resolved URL
          this.pointcuts[path] = result.pointcuts;
          return path;
        }

        if (!path.length) {
          this.pointcuts['__INJECT_no_path'] = result.pointcuts;
          return '';
        }

        // take off the :// to replace later
        relativeTo = relativeTo.replace(PROTOCOL_REGEX, PROTOCOL_EXPANDED_STRING);
        path = path.replace(PROTOCOL_REGEX, PROTOCOL_EXPANDED_STRING);

        // #169: query strings in base
        if (/\?/.test(relativeTo)) {
          resolvedUrl = relativeTo + path;
        }
        else {
          resolvedUrl = this.computeRelativePath(path, relativeTo);
        }

        resolvedUrl = resolvedUrl.replace(PROTOCOL_EXPANDED_REGEX, PROTOCOL_STRING);

        // for everyone else...
        if (!noSuffix && result.useSuffix && userConfig.useSuffix && !FILE_SUFFIX_REGEX.test(resolvedUrl)) {
          resolvedUrl = resolvedUrl + BASIC_FILE_SUFFIX;
        }

        // store pointcuts based on the resolved URL
        this.pointcuts[resolvedUrl] = result.pointcuts;

        return resolvedUrl;
      },

      /**
       * Dismantles and reassembles a relative path by exploding on slashes
       * @method RulesEngine.computeRelativePath
       * @param {String} id - the initial identifier
       * @param {String} base - the base path for relative declarations
       * @private
       * @returns {String} a resolved path with no relative references
       */
      computeRelativePath: function (id, base) {
        var blownApartURL;
        var resolved = [];
        var piece;

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
      },

      /**
       * Get the pointcuts associated with a given URL path
       * @method RulesEngine.getPointcuts
       * @param {String} path - the url path to get pointcuts for
       * @param {Boolean} asString - if TRUE, return the pointcuts bodies as a string
       * @public
       * @returns {Object} an object containing all pointcuts for the URL
       */
      getPointcuts: function (path, asString) {
        // allow lookup for empty path
        path = path || '__INJECT_no_path';
        var pointcuts = this.pointcuts[path] || {before: [], after: []};
        var result = {};
        var pointcut;
        var type;

        if (typeof(asString) === 'undefined') {
          return pointcuts;
        }

        for (type in pointcuts) {
          if (pointcuts.hasOwnProperty(type)) {
            for (var i = 0, len = pointcuts[type].length; i < len; i++) {
              pointcut = pointcuts[type][i];
              if (!result[type]) {
                result[type] = [];
              }
              result[type].push(functionToPointcut(pointcut));
            }
          }
        }

        for (type in result) {
          if (result.hasOwnProperty(type)) {
            result[type] = result[type].join('\n');
          }
        }

        return result;

      },

      clearRules: function () {
        rules = [];
        rulesIsDirty = false;
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
       * <li>ruleSet.pointcuts.before (deprecated): a function to run before executing this module</li>
       * <li>ruleSet.pointcuts.after (deprecated): a function to run after executing this module</li>
       * </ul>
       * @method RulesEngine.addRule
       * @param {RegExp|String} regexMatch - a stirng or regex to match on
       * @param {int} weight - a weight for the rule. Larger values run later
       * @param {Object} ruleSet - an object containing the rules to apply
       * @public
       */
      addRule: function (regexMatch, weight, ruleSet) {
        // regexMatch, ruleSet
        // regexMatch, weight, ruleSet
        if (typeof(ruleSet) === 'undefined') {
          if (typeof(weight) === 'undefined') {
            // one param
            ruleSet = regexMatch;
            weight = null;
            regexMatch = null;
          }

          // two params
          ruleSet = weight;
          weight = null;
        }

        // if weight was not set, create it
        if (!weight) {
          weight = rules.length;
        }

        if (typeof(ruleSet) === 'string') {
          ruleSet = {
            path: ruleSet
          };
        }

        if (!ruleSet.pointcuts) {
          ruleSet.pointcuts = {};
        }

        if (ruleSet.pointcuts.before || ruleSet.pointcuts.after) {
          debugLog('RulesEngine', 'deprecated pointcuts in rule for ' + regexMatch.toString());
        }

        rulesIsDirty = true;
        rules.push({
          matches: ruleSet.matches || regexMatch,
          weight: ruleSet.weight || weight,
          useSuffix: (ruleSet.useSuffix === false) ? false : true,
          last: ruleSet.last || false,
          path: ruleSet.path,
          pointcuts: ruleSet.pointcuts || {}
        });

      },

      /**
       * a shortcut method for multiple addRule calls
       * @method RulesEngine.manifest
       * @param {Object} manifestObj - a "matchString":ruleSet object
       * @public
       * @see RulesEngine.addRule
       */
      manifest: function (manifestObj) {
        var key;
        var rule;

        for (key in manifestObj) {
          rule = manifestObj[key];
          // update the key to a "matches" if included in manifest
          if (rule.matches) {
            key = rule.matches;
          }
          this.addRule(key, rule);
        }
      },

      /**
       * Apply a set of rules to a given path
       * @method RulesEngine.applyRules
       * @param {String} path - the path to apply rules to
       * @private
       * @returns {Object} an object containing the resolved path and pointcuts
       */
      applyRules: function (path) {
        if (rulesIsDirty) {
          sortRulesTable();
        }

        var result = path;
        var payload;
        var allPointcuts = {};
        var useSuffix = true;
        var done = false;
        each(rules, function (rule) {
          if (done) {
            return;
          }

          var match = false;
          // rule matching
          if (typeof(rule.matches) === 'string' && rule.matches === result) {
            match = true;
          }
          else if (rule.matches instanceof RegExp && rule.matches.test(result)) {
            match = true;
          }
          // if we have a match, do a replace
          if (match) {
            if (typeof(rule.path) === 'string') {
              result = rule.path;
            }
            else if (typeof(rule.path) === 'function') {
              result = rule.path(result);
            }

            if (rule.useSuffix === false) {
              useSuffix = false;
            }

            for (var type in rule.pointcuts) {
              if (rule.pointcuts.hasOwnProperty(type)) {
                if (!allPointcuts[type]) {
                  allPointcuts[type] = [];
                }
                allPointcuts[type].push(rule.pointcuts[type]);
              }
            }

            if (rule.last) {
              done = true;
            }
          }

        });

        payload = {
          resolved: result || '',
          useSuffix: useSuffix,
          pointcuts: allPointcuts
        };

        return payload;

      }
    };
  });
  RulesEngine = new AsStatic();
})();

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
 * TreeDownloader, as its name implies, downloads a tree starting
 * at its root node. Once all nodes have been downloaded, a
 * callback can be invoked. Circular references are resolved
 * into a downloaded state and the TreeNode object is flagged
 * as downloaded.
 * @file
**/
var TreeDownloader = Class.extend(function () {
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
      var identifier = RulesEngine.resolveIdentifier(node.getValue().name, parentName);

      // modules are relative to identifiers, not to URLs
      node.getValue().path = RulesEngine.resolveUrl(identifier);

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

      this.log('requesting file', node.getValue().path);
      getFunction = (node.getValue().path) ? Communicator.get : Communicator.noop;
      getFunction(node.getValue().name, node.getValue().path, proxy(function (contents) {
        this.log('download complete', node.getValue().path);

        /*
        IMPORTANT
        This next section uses a flow control library, as afterDownload is the "new" style
        pointcut. It enables cool stuff like making external requests as part of the mutation,
        direct assignment, and more. The flow library we use is intentionally very simple.
        Please see https://github.com/jeromeetienne/gowiththeflow.js to learn more about the
        really small library we opted to use.
        */

        // afterFetch pointcut if available
        // this.pointcuts[resolvedUrl] = result.pointcuts;
        var pointcuts = RulesEngine.getPointcuts(node.getValue().path);
        var pointcutsStr = RulesEngine.getPointcuts(node.getValue().path, true);
        var afterFetch = pointcuts.afterFetch || [];
        var parentName = (node.getParent()) ? node.getParent().getValue().name : '';

        // create a new flow control object and prime it with our contents
        var apFlow = new Flow();
        apFlow.seq(function (next) {
          next(null, contents);
        });

        // for every "after fetch" download, call it with contents, moduleName, and parentName
        var makeFlow = function (i) {
          apFlow.seq(function (next, error, contents) {
            afterFetch[i](next, contents, node.getValue().name, parentName);
          });
        };
        for (var i = 0, len = afterFetch.length; i < len; i++) {
          makeFlow(i);
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

          var before = (pointcutsStr.before) ? [pointcutsStr.before, '\n'].join('') : '';
          var after = (pointcutsStr.after) ? [pointcutsStr.after, '\n'].join('') : '';
          contents = [before, contents, after].join('');

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

            var results = Analyzer.extractRequires(contents);
            var tempRequires = results;
            var requires = [];
            var childNode;
            var name;
            var path;
            var callReduceCommand = proxy(function () {
              this.reduceCallsRemaining(callback, node);
            }, this);

            // remove already-defined AMD modules before we go further
            for (var i = 0, len = tempRequires.length; i < len; i++) {
              name = RulesEngine.resolveIdentifier(tempRequires[i], node.getValue().resolvedId);
              if (!Executor.isModuleDefined(name) && !Executor.isModuleDefined(tempRequires[i])) {
                requires.push(tempRequires[i]);
              }
            }

            this.log('dependencies (' + requires.length + '):' + requires.join(', '));

            // for each requires, create a child and spawn
            if (requires.length) {
              this.increaseCallsRemaining(requires.length);
            }
            for (var i = 0, len = requires.length; i < len; i++) {
              name = (results.amd) ? RulesEngine.resolveIdentifier(requires[i], node.getValue().resolvedId): requires[i];
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
var TreeNode = Class.extend(function () {
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
      return this.left = node;
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
      return this.right = node;
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
      return this.parent = node;
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

// jshint
TreeNode = TreeNode;
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
    This file defines the public interface for Inject
    many functions in this collection pass through via proxy
    to internal methods
    @file public interface for Inject
 */
var globalRequire = new RequireContext();

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
    Enables AMD Plugins if that's your thing
    Adds a special rule to make AMD plugins go round
    @method
    @public
  */
  enableAMDPlugins: function () {
    RulesEngine.addRule(/^.+?\!.+$/, {
      last: true,
      useSuffix: false,
      path: function () {
        return ''; // no path, no fetch!
      },
      pointcuts: {
        afterFetch: function (next, text, moduleName, requestorName) {
          var pieces = moduleName.split('!');
          var pluginId = RulesEngine.resolveIdentifier(pieces[0], requestorName);
          var identifier = pieces[1];
          var rq = new RequireContext(moduleName, '');
          rq.ensure([pluginId], function (localReq) {
            var plugin = localReq(pluginId);
            var resolveIdentifier = function (name) {
              return RulesEngine.resolveIdentifier(name, requestorName);
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
              next(null, body);
            };
            plugin.load(normalized, localReq, complete, {});
          });
        }
      }
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
      Clears the local storage caches.
      @see InjectCore.clearCache
      @method
      @public
   */
  clearCache: proxy(InjectCore.clearCache, InjectCore),
  /**
      @see RulesEngine.manifest
      @method
      @public
   */
  manifest: function () {
    RulesEngine.manifest.apply(RulesEngine, arguments);
  },
  /**
      @see RulesEngine.addRule
      @method
      @public
   */
  addRule: function () {
    RulesEngine.addRule.apply(RulesEngine, arguments);
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
context.Inject.version = "0.4.1";
})(this);