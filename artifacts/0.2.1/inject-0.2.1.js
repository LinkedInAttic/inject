/*
Library: Inject
Homepage: https://github.com/jakobo/inject
License: Apache 2.0 License
*/


/*
Inject
Copyright (c) 2011 Jakob Heuser <jakob@felocity.com>. All Rights Reserved.
Apache Software License 2.0 (see below)

lscache library (c) 2011 Pamela Fox
Apache Software License 2.0 (see below)

Porthole
Copyright (c) 2011 Ternary Labs. All Rights Reserved.
MIT License (see below)

APACHE SOFTWARE LICENSE 2.0
===
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

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
  # Inject: Dependency Awesomeness #
  
  Some sample ways to use inject...
      var foo = require("moduleName");
      require.ensure(["moduleOne", "moduleTwo", "moduleThree"], function(require, exports, module) {
        var foo = require("moduleOne");
      })
  
  Configuring Inject
    require.setModuleRoot("http://example.com/path/to/js/root")
    require.setCrossDomain("http://local.example.com/path/to/relay.html", "http://remote.example.com/path/to/relay.html")
    require.manifest({
      moduleName: "http://local.example.com/path/to/module"
    }, [weight])
    require.manifest(function(path) {
    
    }, [weight])
    require.run("appName")
  
  For more details, check out the README or github: https://github.com/Jakobo/inject
  */
  /*
  Constants and Registries used
  */  var Porthole, callbackRegistry, checkComplete, clearFileRegistry, commonJSFooter, commonJSHeader, config, context, counter, createIframe, createTxId, fileExpiration, fileOnComplete, fileRegistry, fileStorageToken, fileStore, getFile, getModule, getPointcuts, getXHR, hostPrefixRegex, hostSuffixRegex, iframeName, isCached, jsSuffix, loadModules, loadQueue, lscache, modulePathRegistry, moduleRegistry, namespace, normalizePath, onModuleLoad, pauseRequired, require, requireRegex, responseSlicer, saveFile, saveModule, schemaVersion, sendToIframe, sendToXhr, setConfig, setUserModules, txnRegistry, userModules, xDomainRpc;
  schemaVersion = 1;
  context = this;
  pauseRequired = false;
  fileRegistry = null;
  xDomainRpc = null;
  fileStorageToken = "FILEDB";
  fileStore = "Inject FileStorage";
  namespace = "Inject";
  fileExpiration = 1440;
  counter = 0;
  loadQueue = [];
  userModules = {};
  moduleRegistry = {};
  modulePathRegistry = {};
  callbackRegistry = {};
  txnRegistry = {};
  fileOnComplete = {};
  config = {
    fileExpiration: fileExpiration
  };
  jsSuffix = /.*?\.js$/;
  hostPrefixRegex = /^https?:\/\//;
  hostSuffixRegex = /^(.*?)(\/.*|$)/;
  iframeName = "injectProxy";
  requireRegex = /require[\s]*\([\s]*(?:"|')([\w\\/\.\:]+?)(?:'|")[\s]*\)/gm;
  responseSlicer = /^(.+?)[\s](.+?)[\s](.+?)[\s]([\w\W]+)$/m;
  /*
  CommonJS wrappers for a header and footer
  these bookend the included code and insulate the scope so that it doesn't impact inject()
  or anything else.
  this helps secure module bleeding
  */
  commonJSHeader = 'with (window) {\n  (function() {\n    var module = {}, exports = {}, require = __INJECT_NS__.require, exe = null;\n    module.id = "__MODULE_ID__";\n    module.uri = "__MODULE_URI__";\n    module.exports = exports;\n    exe = function(module, exports, require) {\n      __POINTCUT_BEFORE__';
  commonJSFooter = '    __POINTCUT_AFTER__\n  };\n  exe.call(module, module, exports, require);\n  return module.exports;\n})();\n}';
  setConfig = function(cfg) {
    /*
      ## setConfig(cfg) ##
      _internal_ Set the config
      */    config = cfg;
    if (!(config.fileExpiration != null)) {
      return config.fileExpiration = fileExpiration;
    }
  };
  setUserModules = function(modl) {
    /*
      ## setUserModules(modl) ##
      _internal_ Set the collection of user defined modules
      */    return userModules = modl;
  };
  getModule = function(module) {
    /*
      ## getModule(module) ##
      _internal_ Get a module by name
      */    return moduleRegistry[module] || false;
  };
  saveModule = function(module, exports) {
    /*
      ## saveModule(module, exports) ##
      _internal_ Save a module by name
      */    if (moduleRegistry[module]) {
      return;
    }
    return moduleRegistry[module] = exports;
  };
  isCached = function(path) {
    /*
      ## isCached(mpath) ##
      _internal_ test if a file is in the cache validity has been moved to lscache
      */    return (fileRegistry != null) && (fileRegistry[path] != null);
  };
  getFile = function(path, cb) {
    /*
      ## getFile(path, cb) ##
      _internal_ Get a file by its path. Asynchronously calls its callback.
      Uses LocalStorage or UserData if available
      */    var file, token;
    token = "" + fileStorageToken + schemaVersion + path;
    if (!fileRegistry) {
      fileRegistry = {};
    }
    if (fileRegistry[path] && fileRegistry[path].length) {
      return cb(true, fileRegistry[path]);
    } else {
      file = lscache.get(token);
      if (file && typeof file === "string" && file.length) {
        fileRegistry[path] = file;
        return cb(true, fileRegistry[path]);
      } else {
        return cb(false, null);
      }
    }
  };
  saveFile = function(path, file) {
    /*
      ## saveFile(path, file) ##
      _internal_ Save a file for resource `path` into LocalStorage or UserData
      Also updates the internal fileRegistry
      */    var token;
    token = "" + fileStorageToken + schemaVersion + path;
    if (isCached(path)) {
      return;
    }
    fileRegistry[path] = file;
    return lscache.set(token, file, config.fileExpiration);
  };
  clearFileRegistry = function(version) {
    var file, lkey, token;
    if (version == null) {
      version = schemaVersion;
    }
    /*
      ## clearFileRegistry(version = schemaVersion) ##
      _internal_ Clears the internal file registry at `version`
      clearing all local storage keys that relate to the fileStorageToken and version
      */
    token = "" + fileStorageToken + version;
    for (lkey in localStorage) {
      file = localStorage[lkey];
      if (lkey.indexOf(token) !== -1) {
        lscache.remove(lkey);
      }
    }
    if (version === schemaVersion) {
      return fileRegistry = {};
    }
  };
  createTxId = function() {
    /*
      ## createTxId() ##
      _internal_ create a transaction id
      */    return "txn_" + (counter++);
  };
  createIframe = function() {
    /*
      ## createIframe() ##
      _internal_ create an iframe to the config.xd.remote location
      */    var iframe, localSrc, src, trimHost, _ref, _ref2;
    src = config != null ? (_ref = config.xd) != null ? _ref.xhr : void 0 : void 0;
    localSrc = config != null ? (_ref2 = config.xd) != null ? _ref2.inject : void 0 : void 0;
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
  getPointcuts = function(module) {
    /*
      ## getPointcuts(module) ##
      _internal_ get the [pointcuts](http://en.wikipedia.org/wiki/Pointcut) for a module if
      specified
      */    var cut, definition, fn, noop, pointcuts;
    noop = function() {};
    pointcuts = {
      before: noop,
      after: noop
    };
    if (!userModules[module]) {
      return pointcuts;
    }
    definition = userModules[module];
    for (cut in pointcuts) {
      fn = pointcuts[cut];
      if (definition[cut]) {
        pointcuts[cut] = definition[cut];
      }
    }
    return pointcuts;
  };
  normalizePath = function(path) {
    /*
      ## normalizePath(path) ##
      _internal_ normalize the path based on the module collection or any functions
      associated with its identifier
      */    var configPath, lookup, moduleDefinition, returnPath, workingPath;
    lookup = path;
    workingPath = path;
    configPath = config.path || "";
    if (modulePathRegistry[path]) {
      return modulePathRegistry[path];
    }
    if (userModules[path]) {
      moduleDefinition = userModules[path];
      if (typeof moduleDefinition === "string") {
        workingPath = moduleDefinition;
      }
      if (typeof moduleDefinition === "object" && moduleDefinition.path) {
        if (typeof moduleDefinition.path === "function") {
          returnPath = moduleDefinition.path(workingPath);
          if (returnPath !== false) {
            workingPath = returnPath;
          }
        }
        if (typeof moduleDefinition.path === "string") {
          workingPath = moduleDefinition.path;
        }
      }
    }
    if (typeof configPath === "function") {
      returnPath = configPath(workingPath);
      if (returnPath !== false) {
        workingPath = returnPath;
      }
    }
    if (workingPath.indexOf("http") === 0 || workingPath.indexOf("https") === 0) {
      modulePathRegistry[lookup] = workingPath;
      return modulePathRegistry[lookup];
    }
    if (workingPath.indexOf("/") !== 0 && typeof configPath === "undefined") {
      throw new Error("Path must be defined");
    }
    if (workingPath.indexOf("/") !== 0 && typeof configPath === "string") {
      workingPath = "" + config.path + workingPath;
    }
    if (!jsSuffix.test(workingPath)) {
      workingPath = "" + workingPath + ".js";
    }
    modulePathRegistry[lookup] = workingPath;
    return modulePathRegistry[lookup];
  };
  loadModules = function(modList, cb) {
    /*
      ## loadModules(modList, cb) ##
      _internal_ load a collection of modules in modList, and once they have all loaded, execute the callback cb
      */    var module, path, paths, txId, _i, _len, _results;
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
      if (!fileOnComplete[path]) {
        fileOnComplete[path] = {
          txns: [],
          loading: false
        };
      }
      if (getModule(module)) {
        paths[module] = getModule(module);
      }
      _results.push(getFile(path, function(ok, val) {
        fileOnComplete[path].txns.push(txId);
        if (ok && typeof val === "string" && val.length) {
          return onModuleLoad(txId, module, path, val);
        } else {
          if (!fileOnComplete[path].loading) {
            fileOnComplete[path].loading = true;
            if (config.xd != null) {
              return sendToIframe(txId, module, path, onModuleLoad);
            } else {
              return sendToXhr(txId, module, path, onModuleLoad);
            }
          }
        }
      }));
    }
    return _results;
  };
  onModuleLoad = function(txId, module, path, text) {
    /*
      ## onModuleLoad(txId, module, path, text) ##
      _internal_ Fired when a module's file has been loaded. Will then set up
      the CommonJS harness, and will capture its exports. After this, it will signal
      to inject() that all items that were waiting on this path should continue checking
      their depdendencies
      */    var cut, cuts, cutsStr, fn, footer, header, requires, runCmd, runModule;
    cuts = getPointcuts(module);
    cutsStr = {};
    for (cut in cuts) {
      fn = cuts[cut];
      cutsStr[cut] = fn.toString().match(/.*?\{([\w\W]*)\}/m)[1];
    }
    header = commonJSHeader.replace(/__MODULE_ID__/g, module).replace(/__MODULE_URI__/g, path).replace(/__INJECT_NS__/g, namespace).replace(/__POINTCUT_BEFORE__/g, cutsStr.before);
    footer = commonJSFooter.replace(/__POINTCUT_AFTER__/g, cutsStr.after);
    runCmd = "" + header + "\n" + text + "\n" + footer + "\n//@ sourceURL=" + path;
    requires = [];
    while (requireRegex.exec(text)) {
      requires.push(RegExp.$1);
    }
    runModule = function() {
      var exports, txn, _i, _len, _ref, _results;
      try {
        exports = context.eval(runCmd);
      } catch (err) {
        throw err;
      }
      saveModule(module, exports);
      saveFile(path, text);
      fileOnComplete[path].loading = false;
      _ref = fileOnComplete[path].txns;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        txn = _ref[_i];
        _results.push(checkComplete(txn));
      }
      return _results;
    };
    if (requires.length > 0) {
      return loadModules(requires, function() {
        return runModule();
      });
    } else {
      return runModule();
    }
  };
  checkComplete = function(txId) {
    /*
      ## checkComplete(txId) ##
      _internal_ check if all modules for a txId have loaded. If so, the callback is fired
      */    var cb, done, modl, module, modules, _i, _len, _ref;
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
    /*
      ## sendToXhr(txId, module, path, cb) ##
      _internal_ request a module at path using xmlHttpRequest. On retrieval, fire off cb
      */    var xhr;
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
    /*
      ## sendToIframe(txId, module, path, cb) ##
      _internal_ request a module at path using Porthole + iframe. On retrieval, the cb will be fired
      */    return xDomainRpc.postMessage("" + txId + " " + module + " " + path);
  };
  getXHR = function() {
    /*
      ## getXHR() ##
      _internal_ get an XMLHttpRequest object
      */    var xmlhttp;
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
  /*
  Main Payloads: require, require.ensure, etc
  */
  require = function(moduleId) {
    /*
      ## require(moduleId) ##
      Return the value of a module. This is a synchronous call, meaning the module needs
      to have already been loaded. If you are unsure about the module's existence, you
      should be using require.ensure() instead. For modules beyond the first tier, their
      shallow dependencies are resolved and block, so there is no need for require.ensure()
      beyond the topmost level.
      */    var mod;
    mod = getModule(moduleId);
    if (mod === false) {
      throw new Error("" + moduleId + " not loaded");
    }
    return mod;
  };
  require.ensure = function(moduleList, callback) {
    /*
      ## require.ensure(moduleList, callback) ##
      Ensure the modules in moduleList (array) are loaded, and then execute callback
      (function). Use this instead of require() when you need to load shallow dependencies
      first.
      */    var run;
    if ((config.xd != null) && !xDomainRpc && !pauseRequired) {
      createIframe();
      pauseRequired = true;
    }
    run = function() {
      return loadModules(moduleList, function() {
        var exports, module;
        module = {};
        exports = {};
        module.exports = exports;
        return callback.call(context, require, module, exports);
      });
    };
    if (pauseRequired) {
      return loadQueue.push(run);
    } else {
      return run();
    }
  };
  require.setModuleRoot = function(root) {
    /*
      ## require.setModuleRoot(root) ##
      set the base path for including your modules. This is used as the default if no
      items in the manifest can be located.
      
      Optionally, you can set root to a function. The return value of that function will
      be used instead. This can allow for very complex module configurations and branching
      with multiple CDNs such as in a complex production environment.
      */    if (typeof root === "string" && root.lastIndexOf("/") !== root.length) {
      root = "" + root + "/";
    }
    return config.path = root;
  };
  require.setExpires = function(expires) {
    /*
      ## require.setExpires(expires) ##
      Set the time in seconds that files will persist in localStorage. Setting to 0 will disable
      localstorage caching.
      */    return config.fileExpiration = expires;
  };
  require.setCrossDomain = function(local, remote) {
    /*
      ## require.setCrossDomain(local, remote) ##
      Set a pair of URLs to relay files. You must have two relay files in your cross domain setup:
      
      * one relay file (local) on the same domain as the page hosting Inject
      * one relay file (remote) on the domain where you are hosting your root from setModuleRoot()
      
      The same require.setCrossDomain statement should be added to BOTH your relay.html files.
      */    config.xd = {};
    config.xd.inject = local;
    return config.xd.xhr = remote;
  };
  require.clearCache = function(version) {
    /*
      ## require.clearCache(version) ##
      Remove the localStorage class at version. If no version is specified, the entire cache is cleared.
      */    return clearFileRegistry(version);
  };
  require.manifest = function(manifest) {
    /*
      ## require.manifest(manifest) ##
      Provide a custom manifest for Inject. This maps module names to file paths, adds pointcuts, and more.
      The key is always the module name, and then inside of that key can be either
      
      * a String (the path that will be used for resolving that module)
      * an Object containing
      ** path (String or Function) a path to use for the module, behaves like setModuleRoot()
      ** pointcuts (Object) a set of Aspect Oriented functions to run before and after the function.
      
      The pointcuts are a unique solution that allows you to require() things like jQuery. A pointcut could,
      for example add an after() method which sets exports.$ to jQuery.noConflict(). This would restore the
      window to its unpoluted state and make jQuery actionable as a commonJS module without having to alter
      the original library.
      */    return setUserModules(manifest);
  };
  require.run = function(moduleId) {
    /*
      ## require.run(moduleId) ##
      Execute the specified moduleId. This runs an ensure() to make sure the module has been loaded, and then
      execute it.
      */    var foo;
    return foo = "bar";
  };
  context.require = require;
  context.Inject = {
    require: require,
    debug: {
      fileRegistry: fileRegistry,
      loadQueue: loadQueue,
      userModules: userModules,
      moduleRegistry: moduleRegistry,
      modulePathRegistry: modulePathRegistry,
      callbackRegistry: callbackRegistry,
      txnRegistry: txnRegistry
    }
  };
  /*
  Porthole
  */
  Porthole = null;
  
Porthole="undefined"==typeof Porthole||!Porthole?{}:Porthole;Porthole={trace:function(){},error:function(a){try{console.error("Porthole: "+a)}catch(b){}},WindowProxy:function(){}};Porthole.WindowProxy.prototype={postMessage:function(){},addEventListener:function(){},removeEventListener:function(){}};
Porthole.WindowProxyLegacy=function(a,b){void 0===b&&(b="");this.targetWindowName=b;this.eventListeners=[];this.origin=window.location.protocol+"//"+window.location.host;null!==a?(this.proxyIFrameName=this.targetWindowName+"ProxyIFrame",this.proxyIFrameLocation=a,this.proxyIFrameElement=this.createIFrameProxy()):this.proxyIFrameElement=null};
Porthole.WindowProxyLegacy.prototype={getTargetWindowName:function(){return this.targetWindowName},getOrigin:function(){return this.origin},createIFrameProxy:function(){var a=document.createElement("iframe");a.setAttribute("id",this.proxyIFrameName);a.setAttribute("name",this.proxyIFrameName);a.setAttribute("src",this.proxyIFrameLocation);a.setAttribute("frameBorder","1");a.setAttribute("scrolling","auto");a.setAttribute("width",30);a.setAttribute("height",30);a.setAttribute("style","position: absolute; left: -100px; top:0px;");
a.style.setAttribute&&a.style.setAttribute("cssText","position: absolute; left: -100px; top:0px;");document.body.appendChild(a);return a},postMessage:function(a,b){void 0===b&&(b="*");null===this.proxyIFrameElement?Porthole.error("Can't send message because no proxy url was passed in the constructor"):(sourceWindowName=window.name,this.proxyIFrameElement.setAttribute("src",this.proxyIFrameLocation+"#"+a+"&sourceOrigin="+escape(this.getOrigin())+"&targetOrigin="+escape(b)+"&sourceWindowName="+sourceWindowName+
"&targetWindowName="+this.targetWindowName),this.proxyIFrameElement.height=50<this.proxyIFrameElement.height?50:100)},addEventListener:function(a){this.eventListeners.push(a);return a},removeEventListener:function(a){try{this.eventListeners.splice(this.eventListeners.indexOf(a),1)}catch(b){this.eventListeners=[],Porthole.error(b)}},dispatchEvent:function(a){for(var b=0;b<this.eventListeners.length;b++)try{this.eventListeners[b](a)}catch(c){Porthole.error("Exception trying to call back listener: "+
c)}}};Porthole.WindowProxyHTML5=function(a,b){void 0===b&&(b="");this.targetWindowName=b};
Porthole.WindowProxyHTML5.prototype={postMessage:function(a,b){void 0===b&&(b="*");targetWindow=""===this.targetWindowName?top:parent.frames[this.targetWindowName];targetWindow.postMessage(a,b)},addEventListener:function(a){window.addEventListener("message",a,!1);return a},removeEventListener:function(a){window.removeEventListener("message",a,!1)},dispatchEvent:function(a){var b=document.createEvent("MessageEvent");b.initMessageEvent("message",!0,!0,a.data,a.origin,1,window,null);window.dispatchEvent(b)}};
"function"!=typeof window.postMessage?(Porthole.trace("Using legacy browser support"),Porthole.WindowProxy=Porthole.WindowProxyLegacy,Porthole.WindowProxy.prototype=Porthole.WindowProxyLegacy.prototype):(Porthole.trace("Using built-in browser support"),Porthole.WindowProxy=Porthole.WindowProxyHTML5,Porthole.WindowProxy.prototype=Porthole.WindowProxyHTML5.prototype);
Porthole.WindowProxy.splitMessageParameters=function(a){if("undefined"==typeof a||null===a)return null;var b=[],a=a.split(/&/),c;for(c in a){var d=a[c].split("=");b[d[0]]="undefined"==typeof d[1]?"":d[1]}return b};Porthole.MessageEvent=function(a,b,c){this.data=a;this.origin=b;this.source=c};
Porthole.WindowProxyDispatcher={forwardMessageEvent:function(a){a=document.location.hash;if(0<a.length){a=a.substr(1);m=Porthole.WindowProxyDispatcher.parseMessage(a);targetWindow=""===m.targetWindowName?top:parent.frames[m.targetWindowName];var b=Porthole.WindowProxyDispatcher.findWindowProxyObjectInWindow(targetWindow,m.sourceWindowName);b?b.origin==m.targetOrigin||"*"==m.targetOrigin?(a=new Porthole.MessageEvent(m.data,m.sourceOrigin,b),b.dispatchEvent(a)):Porthole.error("Target origin "+b.origin+
" does not match desired target of "+m.targetOrigin):Porthole.error("Could not find window proxy object on the target window")}},parseMessage:function(a){if("undefined"==typeof a||null===a)return null;params=Porthole.WindowProxy.splitMessageParameters(a);var b={targetOrigin:"",sourceOrigin:"",sourceWindowName:"",data:""};b.targetOrigin=unescape(params.targetOrigin);b.sourceOrigin=unescape(params.sourceOrigin);b.sourceWindowName=unescape(params.sourceWindowName);b.targetWindowName=unescape(params.targetWindowName);
a=a.split(/&/);if(3<a.length)a.pop(),a.pop(),a.pop(),a.pop(),b.data=a.join("&");return b},findWindowProxyObjectInWindow:function(a,b){a.RuntimeObject&&(a=a.RuntimeObject());if(a)for(var c in a)try{if(null!==a[c]&&"object"==typeof a[c]&&a[c]instanceof a.Porthole.WindowProxy&&a[c].getTargetWindowName()==b)return a[c]}catch(d){}return null},start:function(){window.addEventListener?window.addEventListener("resize",Porthole.WindowProxyDispatcher.forwardMessageEvent,!1):document.body.attachEvent?window.attachEvent("onresize",
Porthole.WindowProxyDispatcher.forwardMessageEvent):Porthole.error("Can't attach resize event")}};
;
  /*
  lscache library
  */
  lscache = null;
  
var lscache=function(){function g(){return Math.floor((new Date).getTime()/6E4)}function l(a,b,f){function o(){try{localStorage.setItem(a+c,g()),0<f?(localStorage.setItem(a+d,g()+f),localStorage.setItem(a,b)):0>f||0===f?(localStorage.removeItem(a+c),localStorage.removeItem(a+d),localStorage.removeItem(a)):localStorage.setItem(a,b)}catch(h){if("QUOTA_EXCEEDED_ERR"===h.name||"NS_ERROR_DOM_QUOTA_REACHED"==h.name){if(0===i.length&&!m)return localStorage.removeItem(a+c),localStorage.removeItem(a+d),localStorage.removeItem(a),
!1;m&&(m=!1);if(!e){for(var n=0,l=localStorage.length;n<l;n++)if(j=localStorage.key(n),-1<j.indexOf(c)){var p=j.split(c)[0];i.push({key:p,touched:parseInt(localStorage[j],10)})}i.sort(function(a,b){return a.touched-b.touched})}if(k=i.shift())localStorage.removeItem(k.key+c),localStorage.removeItem(k.key+d),localStorage.removeItem(k.key);o()}}}var e=!1,m=!0,i=[],j,k;o()}var d="-EXP",c="-LRU",e;try{e=!!localStorage.getItem}catch(q){e=!1}var h=null!=window.JSON;return{set:function(a,b,c){if(e){if("string"!=
typeof b){if(!h)return;try{b=JSON.stringify(b)}catch(d){return}}l(a,b,c)}},get:function(a){function b(a){if(h)try{return JSON.parse(localStorage.getItem(a))}catch(b){return localStorage.getItem(a)}else return localStorage.getItem(a)}if(!e)return null;if(localStorage.getItem(a+d)){var f=parseInt(localStorage.getItem(a+d),10);if(g()>=f)localStorage.removeItem(a),localStorage.removeItem(a+d),localStorage.removeItem(a+c);else return localStorage.setItem(a+c,g()),b(a)}else if(localStorage.getItem(a))return localStorage.setItem(a+
c,g()),b(a);return null},remove:function(a){if(!e)return null;localStorage.removeItem(a);localStorage.removeItem(a+d);localStorage.removeItem(a+c)}}}();
;
}).call(this);
