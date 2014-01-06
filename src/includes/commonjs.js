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
