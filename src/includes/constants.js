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

