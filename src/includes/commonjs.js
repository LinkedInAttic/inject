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
  '      // id: __MODULE_ID__ uri: __MODULE_URI__',
  '      var module = __INJECT_NS__.INTERNAL.modules.__FUNCTION_ID__,',
  '          require = __INJECT_NS__.INTERNAL.createRequire(module.id, module.uri),',
  '          define = function() {',
  '            // this is a serial define and is no longer functioning asynchronously',
  '            function isArray(a) {',
  '              return (Object.prototype.toString.call(a) === "[object Array]");',
  '            }',
  '            var deps = [];',
  '            var depends = [];',
  '            var factory = {};',
  '            var result;',
  '            for (var i = 0, len = arguments.length; i < len; i++) {',
  '              if (isArray(arguments[i])) {',
  '                depends = arguments[i];',
  '                break;',
  '              }',
  '            }',
  '            factory = arguments[arguments.length - 1];',
  '            for (var i = 0, len = depends.length; i < len; i++) {',
  '              switch(depends[i]) {',
  '              case "require":',
  '                deps.push(require);',
  '                break;',
  '              case "module":',
  '                deps.push(module);',
  '                break;',
  '              case "exports":',
  '                deps.push(module.exports);',
  '                break;',
  '              default:',
  '                deps.push(require(depends[i]))',
  '              }',
  '            }',
  '            if (typeof factory === "function") {',
  '              result = factory.apply(module, deps);',
  '              if (result) {',
  '                module.exports = result;',
  '              }',
  '            }',
  '            else if (typeof factory === "object") {',
  '              module.exports = factory;',
  '            }',
  '            module.amd = true;',
  '          },',
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
