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

/** @constant the version of inject this is */
var INJECT_VERSION = "0.4.0-pre";

/** @constant a test to determine if this is the IE engine (needed for source in eval commands) */
var IS_IE = eval("/*@cc_on!@*/false");

/** @constant a storagetoken identifier we use for the bucket (lscache) */
var FILE_STORAGE_TOKEN = "INJECT";

/** @constant the version of data storage schema for lscache */
var LSCACHE_SCHEMA_VERSION = 1;

/** @constant the schema version string for validation of lscache schema */
var LSCACHE_SCHEMA_VERSION_STRING = "!version";

/** @constant the cache version string for validation of developer lscache code */
var LSCACHE_APP_KEY_STRING = "!appCacheKey";

/** @constant AMD modules that are deferred have this set as their "arg[0]" as a way to flag */
var AMD_DEFERRED = "###DEFERRED###";

/** @constant the namespace for inject() that is publicly reachable */
var NAMESPACE = "Inject";

/** @constant Regex for identifying things that end in *.js or *.txt */
var FILE_SUFFIX_REGEX = /.*?\.(js|txt)(\?.*)?$/;

/** @constant This is the basic suffix for JS files. When there is no extension, we add this if enabled */
var BASIC_FILE_SUFFIX = ".js";

/** @constant prefixes for URLs that begin with http/https */
var HOST_PREFIX_REGEX = /^https?:\/\//;

/** @constant suffix for URLs used to capture everything up to / or the end of the string */
var HOST_SUFFIX_REGEX = /^(.*?)(\/.*|$)/;

/**
 * @constant a regular expression for slicing a response from iframe communication into its parts
 * (1) Anything up to a space (status code)
 * (2) Anything up to a space (moduleid)
 * (3) Any text up until the end of the string (file)
 **/
var RESPONSE_SLICER_REGEX = /^(.+?)[\s]+([\w\W]+?)[\s]+([\w\W]+)$/m;

/** @constant a regex to locate the function() opener */
var FUNCTION_REGEX = /^[\s\(]*function[^\(]*\(([^)]*)\)/;

/** @constant a regex to locate newlines within a function body */
var FUNCTION_NEWLINES_REGEX = /\/\/.*?[\r\n]|\/\*(?:.|[\r\n])*?\*\//g;

/** @constant captures the body of a JS function */
var FUNCTION_BODY_REGEX = /[\w\W]*?\{([\w\W]*)\}/m;

/** @constant locate whitespace within a function body */
var WHITESPACE_REGEX = /\s+/g;

/** @constant extract require() statements from within a larger string */
var REQUIRE_REGEX = /(?:^|[^\w\$_.\(])require\s*\(\s*("[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*')\s*\)/g;

/** @constant extract define() statements from within a larger string */
var DEFINE_EXTRACTION_REGEX = /(?:^|[\s]+)define[\s]*\([\s]*((?:"|')\S+(?:"|'))?,?[\s]*(?:\[([\w\W]+)\])?/g;

/** @constant index of all commonJS builtins in a function arg collection */
var BUILTINS = {require: true, exports: true, module: true};

/** @constant a regex for replacing builtins and quotes */
var BUILTINS_REPLACE_REGEX = /[\s]|"|'|(require)|(exports)|(module)/g;

/** @constant capture anything that involves require*, aggressive to cut down the number of lines we analyze */
var GREEDY_REQUIRE_REXEX = /require.*/;

/** @constant match comments in our file (so we can strip during a static analysis) */
var JS_COMMENTS_REGEX = /(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/mg;

/** @constant identifies a path as relative */
var RELATIVE_PATH_REGEX = /^(\.{1,2}\/).+/;

/** @constant identifies a path as absolute fully-qualified URL */
var ABSOLUTE_PATH_REGEX = /^([A-Za-z]+:)?\/\//;

/** @constant run a test to determine if localstorage is available */
var HAS_LOCAL_STORAGE = (function() {
  try {
    localStorage.setItem("injectLStest", "ok");
    localStorage.removeItem("injectLStest");
    return true;
  }
  catch (err) {
    return false;
  }
})();

