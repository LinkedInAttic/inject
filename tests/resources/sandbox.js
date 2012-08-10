/*

Sandbox.js: https://github.com/TooTallNate/SandboxJS

 Copyright (c) 2011 Nathan Rajlich

 Permission is hereby granted, free of charge, to any person
 obtaining a copy of this software and associated documentation
 files (the "Software"), to deal in the Software without
 restriction, including without limitation the rights to use,
 copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the
 Software is furnished to do so, subject to the following
 conditions:

 The above copyright notice and this permission notice shall be
 included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 OTHER DEALINGS IN THE SOFTWARE.
*/
(function(window, document, undefined) {

  // Helps minimization
  var True = true;
  var False = false;
  var Eval = 'eval';

  // A Boolean flag that, when set, determines whether or not the browser
  // supports setting the '__proto__' property on the Window object.
  // Firefox, for example, supports __proto__ on other Objects, but not Window.
  var supportsProto;
  
  // The list of properties that should NOT be removed from the global
  // window instance, even if the "bare" parameter is set to `true`.
  var INSTANCE_PROPERTIES_WHITELIST = {
    "parseInt":undefined, "parseFloat":undefined,
    "JSON":undefined,
    "Array":undefined, "Boolean":undefined, "Date":undefined, "Function":undefined, "Number":undefined, "Object":undefined, "RegExp":undefined, "String":undefined,
    "Error":undefined, "EvalError":undefined, "RangeError":undefined, "ReferenceError":undefined, "SyntaxError":undefined, "TypeError":undefined, "URIError":undefined,
    "setTimeout":undefined, "clearTimeout":undefined, "setInterval":undefined, "clearInterval":undefined, 
    "eval":undefined, "execScript":undefined,
    "undefined":undefined,
    "escape":undefined, "unescape":undefined,
    "encodeURI":undefined, "encodeURIComponent":undefined, "decodeURI":undefined, "decodeURIComponent":undefined,
    "NaN":undefined, "Infinity":undefined, "Math":undefined,
    "isNaN":undefined, "isFinite":undefined,
    // Unfortunately, the 'location' property makes the 'iframe' attempt to go
    // to a new URL if this is set, so we can't touch it. It must stay, and must
    // not be a variable name used by scripts.
    "location":undefined,
    // 'document' is needed for the current "load" implementation.
    // TODO: Figure out a better way to inject <script> tags into the iframe.
    "document":undefined
  };
  
  var INSTANCE_PROPERTIES_BLACKLIST = [
    'constructor',
    'Window', 'DOMWindow',
    'XMLHttpRequest'
  ];
  
  
  /**
   * The 'Sandbox' constructor. Accepts a 'bare' parameter, which defaults
   * to 'true'. If set to true, the sandbox instance is attempted to be stripped
   * of all additional browser/DOM objects and functions.
   * @constructor
   */
  function Sandbox(bare) {

    // The 'bare' parameter determines whether or not the sandbox scope should
    // be attempted to be cleared out of any extra browser/DOM objects and functions.
    // `true` attempts to make the sandbox as close to a 'bare' JavaScript
    // environment as possible, and `false` leaves things like 'alert' available.
    bare = bare !== False ? True : False;
    this['bare'] = bare;

    // Append to document so that 'contentWindow' is accessible
    var iframe = document.createElement("iframe");
    // Make the 'iframe' invisible, so it doesn't affect the HTML layout.
    iframe.style.display = "none";

    // use technique described here http://paulirish.com/2011/surefire-dom-element-insertion/
    // to allow us to insert before the body tag has been loaded
    var ref = document.getElementsByTagName('script')[0];
    ref.parentNode.insertBefore(iframe, ref);

    // Get a reference to the 'global' scope, and document instance
    var windowInstance = iframe['contentWindow'], documentInstance = windowInstance['document'];
    this['global'] = windowInstance;

    // Get a 'binded' eval function so we can execute arbitary JS inside the
    // new scope.
    documentInstance['open']();
    documentInstance['write'](
      "<script>"+
      "var MSIE/*@cc_on =1@*/;"+ // sniff
      "_e=MSIE?this:{eval:function(s){return window.eval(s)}}"+
      "<\/script>");
    documentInstance['close']();
    var evaler = windowInstance['_e'];
    this[Eval] = function(s) {
      return evaler[Eval](s);
    }
    try {
      delete windowInstance['_e'];
    } catch(ex) {
      this[Eval]('delete _e');
    }

    // Define the "load" function, which returns a Script instance that
    // will be executed inside the sandboxed 'scope'.
    this['load'] = function(filename, callback) {
      var str = "_s = document.createElement('script');"+
        "_s.setAttribute('type','text/javascript');"+
        "_s.setAttribute('src','"+filename.replace(/'/g, "\\'")+"');";
      if (callback) {
        function cb(e) {
          if (cb.called) return; // Callback already executed...
          if (!this.readyState || /complete|loaded/i.test(this.readyState)) {
            cb.called = True;
            callback(e);
          }
        }
        this[Eval](str);
        windowInstance['_s'].onload = windowInstance['_s'].onreadystatechange = cb;
        str = "";
      }
      this[Eval](str + "document.getElementsByTagName('head')[0].appendChild(_s);delete _s;");
    }

    // Synchronous load using XHR. This is discouraged.
    this['loadSync'] = function(filename) {
      throw new Error("NOT YET IMPLEMENTED: Make a GitHub Issue if you need this...");
    }

    if (bare) {
      // The scope that an iframe creates for us is polluted with a bunch of
      // DOM and window properties. We need to try our best to remove access to
      // as much of the default 'window' as possible, and provide the scope with
      // as close to a 'bare' JS environment as possible. Especially 'parent'
      // needs to be restricted, which provides access to the page's global
      // scope (very bad!).

      // Collect all the 'whitelisted' properties in an obj, we'll use it after
      // the scope has been cleaned out to ensure they all exist
      var allowed = {};
      for (var i in INSTANCE_PROPERTIES_WHITELIST) {
        allowed[i] = windowInstance[i];
      }

      if (supportsProto === True) {
        windowInstance['__proto__'] = Object.prototype;
      } else if (supportsProto === False) {
        obliterateConstructor.call(this, windowInstance);
      } else {
        function fail() {
          //console.log("browser DOES NOT support '__proto__'");
          supportsProto = False;
          obliterateConstructor.call(this, windowInstance);
        }
        try {
          // We're gonna test if the browser supports the '__proto__' property
          // on the Window object. If it does, then it makes cleaning up any
          // properties inherited from the 'prototype' a lot easier.
          if (windowInstance['__proto__']) {
            var proto = windowInstance['__proto__'];
            proto['_$'] = True;
            if (windowInstance['_$'] !== True) {
              fail();
            }
            windowInstance['__proto__'] = Object.prototype;
            if (!!windowInstance['_$']) {
              // If we set '__proto__', but '_$' still exists, then setting that
              // property is not supported on the 'Window' at least, resort to obliteration.
              delete proto['_$'];
              windowInstance['__proto__'] = proto;
              fail();
            }
            // If we got to here without any errors being thrown, and without "fail()"
            // being called, then it seems as though the browser supports __proto__!
            if (supportsProto !== False) {
              //console.log("browser supports '__proto__'!!");
              supportsProto = True;
            }
          }
        } catch(e) {
          fail();
        }        
      }
      
      // Go through all the iterable global properties in the sandboxed scope,
      // and obliterate them as long as they're not on the whitelist.
      for (var i in windowInstance) {
        if (i in INSTANCE_PROPERTIES_WHITELIST) continue;
        obliterate(windowInstance, i);
      }
      
      // Ensure that anything on the BLACKLIST is gone
      for (var i=0, l=INSTANCE_PROPERTIES_BLACKLIST.length; i<l; i++) {
        var prop = INSTANCE_PROPERTIES_BLACKLIST[i];
        if (prop in INSTANCE_PROPERTIES_WHITELIST) continue;
        obliterate(windowInstance, prop);
      }

      // We might have obliterated some whitelist properties on accident,
      // copy over the global scope's copies if we did
      for (var i in INSTANCE_PROPERTIES_WHITELIST) {
        if (!!windowInstance[i]) continue;
        windowInstance[i] = allowed[i];
      }
      allowed = null;

    }

    // Inside the sandbox scope, use the 'global' property if you MUST get a reference
    // to the sandbox's global scope (in reality, the 'iframe's Window object). This is
    // encouraged over the use of 'window', since that seems impossible to hide in all
    // browsers.
    windowInstance['global'] = windowInstance;
  }

  function obliterate(obj, prop) {
    try {
      delete obj[prop];
      if (!obj[prop]) return;
    } catch(e){}
    try {
      obj[prop] = undefined;
      if (!obj[prop]) return;
    } catch(e){}
    var value;
    if ("__defineGetter__" in obj) {
      try {
        obj.__defineGetter__(prop, function() {
          return value;
        });
        obj.__defineSetter__(prop, function(v) {
          value = v;
        });
      } catch(ex) {}
    }
    try {
      obj[prop] = undefined;
    } catch(ex) {}
  }

  function obliterateConstructor(windowInstance) {
    //console.log("attempting to obliterate the constructor's prototype");
    var windowConstructor = windowInstance['constructor'] || windowInstance['DOMWindow'] || windowInstance['Window'],
      windowProto = windowConstructor ? windowConstructor.prototype : windowConstructor['__proto__'];
    if (windowProto) {
      for (var i in windowProto) {
        try {
          delete windowProto[i];
        } catch(e){}
      }
      for (var i in windowProto) {
        obliterate(windowProto, i);
      }
    } else {
      //console.log("could not find 'prototype'");
    }
  }

  // Make visible to the global scope.
  window['Sandbox'] = Sandbox;

})(window, document)