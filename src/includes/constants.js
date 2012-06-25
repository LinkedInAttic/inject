// the version of inject this is
var INJECT_VERSION = "0.4.0-pre";

// a test to determine if this is the IE engine (needed for source in eval commands)
var isIE = eval("/*@cc_on!@*/false");

// a storagetoken identifier we use (lscache)
var fileStorageToken = "INJECT";

// the version of data storage schema for lscache
var schemaVersion = 1;

// the schema version string for validation of lscache schema
var schemaVersionString = "!version";

// the namespace for inject() that is publicly reachable
var namespace = "Inject";

// Regex for identifying things that end in *.js or *.txt
var fileSuffix = /.*?\.(js|txt)(\?.*)?$/;

// prefixes for URLs that begin with http/https
var hostPrefixRegex = /^https?:\/\//;

// suffix for URLs used to capture everything up to / or the end of the string
var hostSuffixRegex = /^(.*?)(\/.*|$)/;

// a regular expression for slicing a response from iframe communication into its parts
// (1) Anything up to a space (status code)
// (2) Anything up to a space (moduleid)
// (3) Any text up until the end of the string (file)
var responseSlicer = /^(.+?)[\s]+([\w\W]+?)[\s]+([\w\W]+)$/m;

// Regexes to extract function identifiers, comments, require() statements, or requirements from a define() call
// locate the function() opener
var functionRegex = /^[\s\(]*function[^\(]*\(([^)]*)\)/;

// locate newlines within a function body
var functionNewlineRegex = /\/\/.*?[\r\n]|\/\*(?:.|[\r\n])*?\*\//g;

// locate whitespace within a function body
var functionSpaceRegex = /\s+/g;

// extract require() statements from within a larger string
var requireRegex = /(?:^|[^\w\$_.\(])require\s*\(\s*("[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*')\s*\)/g;

// extract define() statements from within a larger string
var defineStaticRequireRegex = /^[\r\n\s]*define\(\s*("\S+",|'\S+',|\s*)\s*\[([^\]]*)\],\s*(function\s*\(|\{).+/;

// capture anything that involves require*, aggressive to cut down the number of lines we analyze
var requireGreedyCapture = /require.*/;

// match comments in our file (so we can strip during a static analysis)
var commentRegex = /(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/mg;

// identifies a require() path as relative
var relativePathRegex = /^(\.{1,2}\/).+/;

// identifies a require() path as absolute fully-qualified URL
var absolutePathRegex = /^([A-Za-z]+:)?\/\//;

// run a test to determine if localstorage is available
var hasLocalStorage = (function() {
  try {
    localStorage.setItem("injectLStest", "ok");
    localStorage.removeItem("injectLStest");
    return true;
  }
  catch (err) {
    return false;
  }
})();

