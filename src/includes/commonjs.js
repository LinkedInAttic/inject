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
var commonJSHeader = ([
'__INJECT_NS__.INTERNAL.execute.__FUNCTION_ID__ = function() {',
'  with (window) {',
'    var module = __INJECT_NS__.INTERNAL.createModule("__MODULE_ID__", "__MODULE_URI__"),',
'        require = __INJECT_NS__.INTERNAL.createRequire("__MODULE_ID__", "__MODULE_URI__"),',
'        define = __INJECT_NS__.INTERNAL.createDefine("__MODULE_ID__", "__MODULE_URI__"),',
'        __exe = null;',
'        exports = module.exports;',
'    __exe = function() {',
'']).join('\n');

/**
    CommonJS footer with placeholders for Inject namespace, exception, and
    pointcut after advice.
    @type {string}
    @global
*/
var commonJSFooter = ([
'    };',
'    __INJECT_NS__.INTERNAL.defineExecutingModuleAs(module.id, module.uri);',
'    __error = window.onerror;',
'    try {',
'      __exe.call(module);',
'    }',
'    catch (__EXCEPTION__) {',
'      module.error = __EXCEPTION__;',
'    }',
'    __INJECT_NS__.INTERNAL.undefineExecutingModule();',
'    return module;',
'  }',
'};',
'']).join('\n');
