// the version of inject this is
var INJECT_VERSION = "0.4.0-pre";

// a test to determine if this is the IE engine (needed for source in eval commands)
var IS_IE = eval("/*@cc_on!@*/false");

// a storagetoken identifier we use (lscache)
var FILE_STORAGE_TOKEN = "INJECT";

// the version of data storage schema for lscache
var LSCACHE_SCHEMA_VERSION = 1;

// the schema version string for validation of lscache schema
var LSCACHE_SCHEMA_VERSION_STRING = "!version";

// the namespace for inject() that is publicly reachable
var NAMESPACE = "Inject";

// Regex for identifying things that end in *.js or *.txt
var FILE_SUFFIX_REGEX = /.*?\.(js|txt)(\?.*)?$/;

// prefixes for URLs that begin with http/https
var HOST_PREFIX_REGEX = /^https?:\/\//;

// suffix for URLs used to capture everything up to / or the end of the string
var HOST_SUFFIX_REGEX = /^(.*?)(\/.*|$)/;

// a regular expression for slicing a response from iframe communication into its parts
// (1) Anything up to a space (status code)
// (2) Anything up to a space (moduleid)
// (3) Any text up until the end of the string (file)
var RESPONSE_SLICER_REGEX = /^(.+?)[\s]+([\w\W]+?)[\s]+([\w\W]+)$/m;

// Regexes to extract function identifiers, comments, require() statements, or requirements from a define() call
// locate the function() opener
var FUNCTION_REGEX = /^[\s\(]*function[^\(]*\(([^)]*)\)/;

// locate newlines within a function body
var FUNCTION_NEWLINES_REGEX = /\/\/.*?[\r\n]|\/\*(?:.|[\r\n])*?\*\//g;

// locate whitespace within a function body
var WHITESPACE_REGEX = /\s+/g;

// extract require() statements from within a larger string
var REQUIRE_REGEX = /(?:^|[^\w\$_.\(])require\s*\(\s*("[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*')\s*\)/g;

// extract define() statements from within a larger string
var DEFINE_REGEX = /^[\r\n\s]*define\(\s*("\S+",|'\S+',|\s*)\s*\[([^\]]*)\],\s*(function\s*\(|\{).+/;

// capture anything that involves require*, aggressive to cut down the number of lines we analyze
var GREEDY_REQUIRE_REXEX = /require.*/;

// match comments in our file (so we can strip during a static analysis)
var JS_COMMENTS_REGEX = /(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/mg;

// identifies a require() path as relative
var RELATIVE_PATH_REGEX = /^(\.{1,2}\/).+/;

// identifies a require() path as absolute fully-qualified URL
var ABSOLUTE_PATH_REGEX = /^([A-Za-z]+:)?\/\//;

// run a test to determine if localstorage is available
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

