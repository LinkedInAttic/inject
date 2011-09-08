/*
Library: Inject
Homepage: https://github.com/jakobo/inject
License: MIT License
*/


/*
Inject
Copyright (c) 2008 Jakob Heuser <jakob@felocity.com>. All Rights Reserved.
MIT License (see below)

Porthole
Copyright (c) 2011 Ternary Labs. All Rights Reserved.
MIT License (see below)

MIT LICENSE
===
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

(function() {
  /*
  Inject: Dependency Awesomeness
  
  Some sample ways to use inject...
  inject("moduleOne", "moduleTwo", "moduleThree", function(a, b, c) {
    // n args, last is function. Inject those modules, then run this body
    // modules are available as arguments
  });
  
  Configuring inject()
  inject().config({
    // where are your JS files? Can also be a function which will do
    // lookups for you
    path: "http://example.com/path/to/js/root",
    
    // if your JS files are on a different domain, you'll need to use
    // relay files. See the readme
    xd: {
      inject: "http://local.example.com/path/to/relay.html",
      xhr: "http://remote.example.com/path/to/relay.html"
    }
  })
  
  Specifying specific module locations (that pathing could never guess)
  inject().modules({
    // module name, module path
    moduleName: "http://example.com/location/of/module.js"
  })
  */
  /*
  Porthole
  */
  
var Porthole=(typeof Porthole=="undefined")||!Porthole?{}:Porthole;Porthole={trace:function(a){try{console.log("Porthole: "+a)}catch(b){}},error:function(a){try{console.error("Porthole: "+a)}catch(b){}}};Porthole.WindowProxy=function(){};Porthole.WindowProxy.prototype={postMessage:function(){},addEventListener:function(a){},removeEventListener:function(a){}};Porthole.WindowProxyLegacy=function(a,b){if(b===undefined){b=""}this.targetWindowName=b;this.eventListeners=[];this.origin=window.location.protocol+"//"+window.location.host;if(a!==null){this.proxyIFrameName=this.targetWindowName+"ProxyIFrame";this.proxyIFrameLocation=a;this.proxyIFrameElement=this.createIFrameProxy()}else{this.proxyIFrameElement=null}};Porthole.WindowProxyLegacy.prototype={getTargetWindowName:function(){return this.targetWindowName},getOrigin:function(){return this.origin},createIFrameProxy:function(){var a=document.createElement("iframe");a.setAttribute("id",this.proxyIFrameName);a.setAttribute("name",this.proxyIFrameName);a.setAttribute("src",this.proxyIFrameLocation);a.setAttribute("frameBorder","1");a.setAttribute("scrolling","auto");a.setAttribute("width",30);a.setAttribute("height",30);a.setAttribute("style","position: absolute; left: -100px; top:0px;");if(a.style.setAttribute){a.style.setAttribute("cssText","position: absolute; left: -100px; top:0px;")}document.body.appendChild(a);return a},postMessage:function(b,a){if(a===undefined){a="*"}if(this.proxyIFrameElement===null){Porthole.error("Can't send message because no proxy url was passed in the constructor")}else{sourceWindowName=window.name;this.proxyIFrameElement.setAttribute("src",this.proxyIFrameLocation+"#"+b+"&sourceOrigin="+escape(this.getOrigin())+"&targetOrigin="+escape(a)+"&sourceWindowName="+sourceWindowName+"&targetWindowName="+this.targetWindowName);this.proxyIFrameElement.height=this.proxyIFrameElement.height>50?50:100}},addEventListener:function(a){this.eventListeners.push(a);return a},removeEventListener:function(b){try{var a=this.eventListeners.indexOf(b);this.eventListeners.splice(a,1)}catch(c){this.eventListeners=[];Porthole.error(c)}},dispatchEvent:function(c){for(var b=0;b<this.eventListeners.length;b++){try{this.eventListeners[b](c)}catch(a){Porthole.error("Exception trying to call back listener: "+a)}}}};Porthole.WindowProxyHTML5=function(a,b){if(b===undefined){b=""}this.targetWindowName=b};Porthole.WindowProxyHTML5.prototype={postMessage:function(b,a){if(a===undefined){a="*"}if(this.targetWindowName===""){targetWindow=top}else{targetWindow=parent.frames[this.targetWindowName]}targetWindow.postMessage(b,a)},addEventListener:function(a){window.addEventListener("message",a,false);return a},removeEventListener:function(a){window.removeEventListener("message",a,false)},dispatchEvent:function(b){var a=document.createEvent("MessageEvent");a.initMessageEvent("message",true,true,b.data,b.origin,1,window,null);window.dispatchEvent(a)}};if(typeof window.postMessage!="function"){Porthole.trace("Using legacy browser support");Porthole.WindowProxy=Porthole.WindowProxyLegacy;Porthole.WindowProxy.prototype=Porthole.WindowProxyLegacy.prototype}else{Porthole.trace("Using built-in browser support");Porthole.WindowProxy=Porthole.WindowProxyHTML5;Porthole.WindowProxy.prototype=Porthole.WindowProxyHTML5.prototype}Porthole.WindowProxy.splitMessageParameters=function(c){if(typeof c=="undefined"||c===null){return null}var e=[];var d=c.split(/&/);for(var b in d){var a=d[b].split("=");if(typeof(a[1])=="undefined"){e[a[0]]=""}else{e[a[0]]=a[1]}}return e};Porthole.MessageEvent=function MessageEvent(c,a,b){this.data=c;this.origin=a;this.source=b};Porthole.WindowProxyDispatcher={forwardMessageEvent:function(c){var b=document.location.hash;if(b.length>0){b=b.substr(1);m=Porthole.WindowProxyDispatcher.parseMessage(b);if(m.targetWindowName===""){targetWindow=top}else{targetWindow=parent.frames[m.targetWindowName]}var a=Porthole.WindowProxyDispatcher.findWindowProxyObjectInWindow(targetWindow,m.sourceWindowName);if(a){if(a.origin==m.targetOrigin||m.targetOrigin=="*"){c=new Porthole.MessageEvent(m.data,m.sourceOrigin,a);a.dispatchEvent(c)}else{Porthole.error("Target origin "+a.origin+" does not match desired target of "+m.targetOrigin)}}else{Porthole.error("Could not find window proxy object on the target window")}}},parseMessage:function(b){if(typeof b=="undefined"||b===null){return null}params=Porthole.WindowProxy.splitMessageParameters(b);var a={targetOrigin:"",sourceOrigin:"",sourceWindowName:"",data:""};a.targetOrigin=unescape(params.targetOrigin);a.sourceOrigin=unescape(params.sourceOrigin);a.sourceWindowName=unescape(params.sourceWindowName);a.targetWindowName=unescape(params.targetWindowName);var c=b.split(/&/);if(c.length>3){c.pop();c.pop();c.pop();c.pop();a.data=c.join("&")}return a},findWindowProxyObjectInWindow:function(a,c){if(a.RuntimeObject){a=a.RuntimeObject()}if(a){for(var b in a){try{if(a[b]!==null&&typeof a[b]=="object"&&a[b] instanceof a.Porthole.WindowProxy&&a[b].getTargetWindowName()==c){return a[b]}}catch(d){}}}return null},start:function(){if(window.addEventListener){window.addEventListener("resize",Porthole.WindowProxyDispatcher.forwardMessageEvent,false)}else{if(document.body.attachEvent){window.attachEvent("onresize",Porthole.WindowProxyDispatcher.forwardMessageEvent)}else{Porthole.error("Can't attach resize event")}}}};
;
  /*
  End Porthole
  */  var callbackRegistry, checkComplete, commonJSFooter, commonJSHeader, config, configInterface, context, counter, createIframe, createTxId, fileRegistry, getFile, getModule, getXHR, inject, jsSuffix, loadModules, loadQueue, modulePathRegistry, moduleRegistry, namespace, normalizePath, oldInject, onModuleLoad, pauseRequired, saveFile, saveModule, sendToIframe, sendToXhr, setConfig, setNamespace, setUserModules, txnRegistry, userModules, xDomainRpc;
  var __slice = Array.prototype.slice;
  context = this;
  oldInject = context.inject;
  pauseRequired = false;
  loadQueue = [];
  config = {};
  setConfig = function(cfg) {
    return config = cfg;
  };
  userModules = {};
  setUserModules = function(modl) {
    return userModules = modl;
  };
  namespace = "";
  setNamespace = function(ns) {
    return namespace = ns;
  };
  moduleRegistry = {};
  getModule = function(module) {
    return moduleRegistry[module] || false;
  };
  saveModule = function(module, exports) {
    if (moduleRegistry[module]) {
      return;
    }
    return moduleRegistry[module] = exports;
  };
  fileRegistry = {};
  getFile = function(path) {
    return fileRegistry[path] || false;
  };
  saveFile = function(path, file) {
    if (fileRegistry[path]) {
      return;
    }
    return fileRegistry[path] = file;
  };
  counter = 0;
  createTxId = function() {
    return "txn_" + (counter++);
  };
  xDomainRpc = null;
  createIframe = function() {
    var hostPrefixRegex, hostSuffixRegex, iframe, iframeName, localSrc, responseSlicer, src, trimHost, _ref, _ref2;
    responseSlicer = /^(.+?) (.+?) (.+?) (.+)$/m;
    hostPrefixRegex = /^https?:\/\//;
    hostSuffixRegex = /^(.*?)(\/.*|$)/;
    src = config != null ? (_ref = config.xd) != null ? _ref.xhr : void 0 : void 0;
    localSrc = config != null ? (_ref2 = config.xd) != null ? _ref2.inject : void 0 : void 0;
    iframeName = "injectProxy";
    if (!src) {
      throw new Error("Configuration requires xd.remote to be defined");
    }
    if (!localSrc) {
      throw new Error("Configuration requires xd.local to be defined");
    }
    trimHost = function(host) {
      host = host.replace(hostPrefixRegex, "").replace(hostSuffixRegex, "$1");
      return host;
    };
    try {
      iframe = document.createElement("<iframe name=\"" + iframeName + "\"/>");
    } catch (err) {
      iframe = document.createElement("iframe");
    }
    iframe.name = iframeName;
    iframe.src = src + "#xhr";
    iframe.style.width = iframe.style.height = "1px";
    iframe.style.right = iframe.style.bottom = "0px";
    iframe.style.position = "absolute";
    iframe.id = iframeName;
    document.body.insertBefore(iframe, document.body.firstChild);
    xDomainRpc = new Porthole.WindowProxy(config.xd.xhr + "#xhr", iframeName);
    return xDomainRpc.addEventListener(function(event) {
      var item, pieces, _i, _len;
      if (trimHost(event.origin) !== trimHost(config.xd.xhr)) {
        return;
      }
      if (event.data === "READY") {
        xDomainRpc.postMessage("READYREADY");
        pauseRequired = false;
        for (_i = 0, _len = loadQueue.length; _i < _len; _i++) {
          item = loadQueue[_i];
          item();
        }
        return;
      }
      pieces = event.data.match(responseSlicer);
      return onModuleLoad(pieces[1], pieces[2], pieces[3], pieces[4]);
    });
  };
  configInterface = {
    config: function(cfg) {
      if (!cfg.path) {
        throw new Error("Config requires at least path to be set");
      }
      if (typeof cfg.path === "string" && cfg.path.lastIndexOf("/") !== cfg.path.length) {
        cfg.path = "" + cfg.path + "/";
      }
      setConfig(cfg);
      return configInterface;
    },
    modules: function(modl) {
      setModules(modl);
      return configInterface;
    },
    noConflict: function(ns) {
      var currentInject;
      setNamespace(ns);
      currentInject = context.inject;
      context.inject = oldInject;
      context[ns] = currentInject;
      return true;
    }
  };
  modulePathRegistry = {};
  jsSuffix = /.*?\.js$/;
  normalizePath = function(path) {
    var configPath, lookup;
    lookup = path;
    configPath = config.path || "";
    if (modulePathRegistry[path]) {
      return modulePathRegistry[path];
    }
    if (userModules[path]) {
      path = userModules[path];
      modulePathRegistry[lookup] = path;
      return path;
    }
    if (typeof configPath === "function") {
      path = configPath(path);
      modulePathRegistry[lookup] = path;
      return path;
    }
    if (path.indexOf("http") === 0 || path.indexOf("https") === 0) {
      modulePathRegistry[lookup] = path;
      return path;
    }
    if (path.indexOf("/") !== 0 && typeof configPath === "undefined") {
      throw new Error("Path must be defined");
    }
    if (path.indexOf("/") !== 0 && typeof configPath === "string") {
      path = "" + config.path + path;
    }
    if (!jsSuffix.test(path)) {
      path = "" + path + ".js";
    }
    modulePathRegistry[lookup] = path;
    return path;
  };
  callbackRegistry = {};
  txnRegistry = {};
  loadModules = function(modList, cb) {
    var module, path, paths, txId, _i, _len, _results;
    txId = createTxId();
    paths = {};
    for (_i = 0, _len = modList.length; _i < _len; _i++) {
      module = modList[_i];
      paths[module] = normalizePath(module);
    }
    txnRegistry[txId] = modList;
    callbackRegistry[txId] = cb;
    _results = [];
    for (module in paths) {
      path = paths[module];
      _results.push(getModule(module) ? paths[module] = getModule(module) : getFile(path) ? onModuleLoad(txId, module, path, getFile(path)) : config.xd != null ? sendToIframe(txId, module, path, onModuleLoad) : sendToXhr(txId, module, path, onModuleLoad));
    }
    return _results;
  };
  commonJSHeader = '(function() {\n  var exports = {};\n  (function() {';
  commonJSFooter = '})();\nreturn exports;\n})();';
  onModuleLoad = function(txId, module, file, text) {
    var exports, runCmd;
    runCmd = "" + commonJSHeader + "\n" + text + "\n" + commonJSFooter;
    try {
      exports = eval(runCmd);
    } catch (err) {
      throw err;
    }
    saveModule(module, exports);
    saveFile(file, text);
    return checkComplete(txId);
  };
  checkComplete = function(txId) {
    var cb, done, modl, module, modules, _i, _len, _ref;
    done = true;
    cb = callbackRegistry[txId];
    modules = [];
    _ref = txnRegistry[txId];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      module = _ref[_i];
      modl = getModule(module);
      if (modl === false) {
        done = false;
      } else {
        modules.push(modl);
      }
      if (!done) {
        break;
      }
    }
    if (done) {
      return cb.call(context, modules);
    }
  };
  sendToXhr = function(txId, module, path, cb) {
    var xhr;
    xhr = getXHR();
    xhr.open("GET", path);
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4 && xhr.status === 200) {
        return cb.call(context, txId, module, path, xhr.responseText);
      }
    };
    return xhr.send(null);
  };
  sendToIframe = function(txId, module, path, cb) {
    console.log("posting: " + txId + " " + module + " " + path);
    return xDomainRpc.postMessage("" + txId + " " + module + " " + path);
  };
  getXHR = function() {
    var xmlhttp;
    xmlhttp = false;
    if (typeof XMLHttpRequest !== "undefined") {
      try {
        xmlhttp = new XMLHttpRequest();
      } catch (errorWin) {
        xmlhttp = false;
      }
    }
    if (!xmlhttp && typeof window.createRequest !== "undefined") {
      try {
        xmlhttp = new window.createRequest();
      } catch (errorCr) {
        xmlhttp = false;
      }
    }
    if (!xmlhttp) {
      try {
        xmlhttp = new ActiveXObject("Msxml2.XMLHTTP");
      } catch (msErrOne) {
        try {
          xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
        } catch (msErrTwo) {
          xmlhttp = false;
        }
      }
    }
    if (!xmlhttp) {
      throw new Error("Could not create an xmlHttpRequest Object");
    }
    return xmlhttp;
  };
  inject = function() {
    var args, fn, run;
    args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    if (args.length === 0) {
      return configInterface;
    }
    if (typeof args[args.length - 1] !== "function") {
      throw new Error("Last argument must be a function");
    }
    fn = args.pop();
    if ((config.xd != null) && !xDomainRpc && !pauseRequired) {
      createIframe();
      pauseRequired = true;
    }
    run = function() {
      return loadModules(args, function(modules) {
        return fn.apply(context, modules);
      });
    };
    if (pauseRequired) {
      return loadQueue.push(run);
    } else {
      return run();
    }
  };
  context.inject = inject;
}).call(this);
