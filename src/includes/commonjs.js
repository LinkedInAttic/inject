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

// TODO: create a special define function in this scope

var commonJSHeader = ([
'__INJECT_NS__.INTERNAL.execute.__FUNCTION_ID__ = function() {',
'  with (window) {',
'    var __module = __INJECT_NS__.INTERNAL.createModule("__MODULE_ID__", "__MODULE_URI__"),',
'        __require = __INJECT_NS__.INTERNAL.createRequire("__MODULE_URI__"),',
'        __define = __INJECT_NS__.INTERNAL.createDefine("__MODULE_URI__"),',
'        __exe = null;',
'    __exe = function(require, module, exports, define) {',
'      __POINTCUT_BEFORE__'
]).join('\n');
var commonJSFooter = ([
'      __POINTCUT_AFTER__',
'    };',
'    __INJECT_NS__.INTERNAL.defineExecutingModuleAs(__module.id);',
'    try {',
'      __exe.call(__module, __require, __module, __module.exports, __define);',
'    }',
'    catch (__EXCEPTION__) {',
'      __module.error = __EXCEPTION__;',
'    }',
'    __INJECT_NS__.INTERNAL.undefineExecutingModule();',
'    return __module;',
'  }',
'};'
]).join('\n');
