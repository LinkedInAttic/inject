var commonJSHeader = ([
'__INJECT_NS__.INTERNAL.execute.__FUNCTION_ID__ = function() {',
'  with (window) {',
'    var __module = __INJECT_NS__.INTERNAL.createModule("__MODULE_ID__", "__MODULE_URI__"),',
'        __require = __INJECT_NS__.INTERNAL.require,',
'        __exe = null;',
'    __INJECT_NS__.INTERNAL.setModuleExports("__MODULE_ID__", __module.exports);',
'    __exe = function(require, module, exports) {',
'      __POINTCUT_BEFORE__'
]).join('');
var commonJSFooter = ([
'      __POINTCUT_AFTER__',
'    };',
'    __INJECT_NS__.INTERNAL.defineAs(__module.id);',
'    try {',
'      __exe.call(__module, __require, __module, __module.exports);',
'    }',
'    catch (__EXCEPTION__) {',
'      __module.error = __EXCEPTION__;',
'    }',
'    __INJECT_NS__.INTERNAL.undefineAs();',
'    return __module;',
'  }',
'};'
]).join('');
