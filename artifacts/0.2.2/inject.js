(function() {/*

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
var Porthole = typeof Porthole == "undefined" || !Porthole ? {} : Porthole;
Porthole = {trace:function(s) {
  try {
    console.log("Porthole: " + s)
  }catch(e) {
  }
}, error:function(s) {
  try {
    console.error("Porthole: " + s)
  }catch(e) {
  }
}};
Porthole.WindowProxy = function() {
};
Porthole.WindowProxy.prototype = {postMessage:function() {
}, addEventListener:function(f) {
}, removeEventListener:function(f) {
}};
Porthole.WindowProxyLegacy = function(proxyIFrameUrl, targetWindowName) {
  if(targetWindowName === undefined) {
    targetWindowName = ""
  }
  this.targetWindowName = targetWindowName;
  this.eventListeners = [];
  this.origin = window.location.protocol + "//" + window.location.host;
  if(proxyIFrameUrl !== null) {
    this.proxyIFrameName = this.targetWindowName + "ProxyIFrame";
    this.proxyIFrameLocation = proxyIFrameUrl;
    this.proxyIFrameElement = this.createIFrameProxy()
  }else {
    this.proxyIFrameElement = null
  }
};
Porthole.WindowProxyLegacy.prototype = {getTargetWindowName:function() {
  return this.targetWindowName
}, getOrigin:function() {
  return this.origin
}, createIFrameProxy:function() {
  var iframe = document.createElement("iframe");
  iframe.setAttribute("id", this.proxyIFrameName);
  iframe.setAttribute("name", this.proxyIFrameName);
  iframe.setAttribute("src", this.proxyIFrameLocation);
  iframe.setAttribute("frameBorder", "1");
  iframe.setAttribute("scrolling", "auto");
  iframe.setAttribute("width", 30);
  iframe.setAttribute("height", 30);
  iframe.setAttribute("style", "position: absolute; left: -100px; top:0px;");
  if(iframe.style.setAttribute) {
    iframe.style.setAttribute("cssText", "position: absolute; left: -100px; top:0px;")
  }
  document.body.appendChild(iframe);
  return iframe
}, postMessage:function(data, targetOrigin) {
  if(targetOrigin === undefined) {
    targetOrigin = "*"
  }
  if(this.proxyIFrameElement === null) {
    Porthole.error("Can't send message because no proxy url was passed in the constructor")
  }else {
    sourceWindowName = window.name;
    this.proxyIFrameElement.setAttribute("src", this.proxyIFrameLocation + "#" + data + "&sourceOrigin=" + escape(this.getOrigin()) + "&targetOrigin=" + escape(targetOrigin) + "&sourceWindowName=" + sourceWindowName + "&targetWindowName=" + this.targetWindowName);
    this.proxyIFrameElement.height = this.proxyIFrameElement.height > 50 ? 50 : 100
  }
}, addEventListener:function(f) {
  this.eventListeners.push(f);
  return f
}, removeEventListener:function(f) {
  try {
    var index = this.eventListeners.indexOf(f);
    this.eventListeners.splice(index, 1)
  }catch(e) {
    this.eventListeners = [];
    Porthole.error(e)
  }
}, dispatchEvent:function(e) {
  for(var i = 0;i < this.eventListeners.length;i++) {
    try {
      this.eventListeners[i](e)
    }catch(ex) {
      Porthole.error("Exception trying to call back listener: " + ex)
    }
  }
}};
Porthole.WindowProxyHTML5 = function(proxyIFrameUrl, targetWindowName) {
  if(targetWindowName === undefined) {
    targetWindowName = ""
  }
  this.targetWindowName = targetWindowName
};
Porthole.WindowProxyHTML5.prototype = {postMessage:function(data, targetOrigin) {
  if(targetOrigin === undefined) {
    targetOrigin = "*"
  }
  if(this.targetWindowName === "") {
    targetWindow = top
  }else {
    targetWindow = parent.frames[this.targetWindowName]
  }
  targetWindow.postMessage(data, targetOrigin)
}, addEventListener:function(f) {
  window.addEventListener("message", f, false);
  return f
}, removeEventListener:function(f) {
  window.removeEventListener("message", f, false)
}, dispatchEvent:function(e) {
  var evt = document.createEvent("MessageEvent");
  evt.initMessageEvent("message", true, true, e.data, e.origin, 1, window, null);
  window.dispatchEvent(evt)
}};
if(typeof window.postMessage != "function") {
  Porthole.trace("Using legacy browser support");
  Porthole.WindowProxy = Porthole.WindowProxyLegacy;
  Porthole.WindowProxy.prototype = Porthole.WindowProxyLegacy.prototype
}else {
  Porthole.trace("Using built-in browser support");
  Porthole.WindowProxy = Porthole.WindowProxyHTML5;
  Porthole.WindowProxy.prototype = Porthole.WindowProxyHTML5.prototype
}
Porthole.WindowProxy.splitMessageParameters = function(message) {
  if(typeof message == "undefined" || message === null) {
    return null
  }
  var hash = [];
  var pairs = message.split(/&/);
  for(var keyValuePairIndex in pairs) {
    var nameValue = pairs[keyValuePairIndex].split("=");
    if(typeof nameValue[1] == "undefined") {
      hash[nameValue[0]] = ""
    }else {
      hash[nameValue[0]] = nameValue[1]
    }
  }
  return hash
};
Porthole.MessageEvent = function MessageEvent(data, origin, source) {
  this.data = data;
  this.origin = origin;
  this.source = source
};
Porthole.WindowProxyDispatcher = {forwardMessageEvent:function(e) {
  var message = document.location.hash;
  if(message.length > 0) {
    message = message.substr(1);
    m = Porthole.WindowProxyDispatcher.parseMessage(message);
    if(m.targetWindowName === "") {
      targetWindow = top
    }else {
      targetWindow = parent.frames[m.targetWindowName]
    }
    var windowProxy = Porthole.WindowProxyDispatcher.findWindowProxyObjectInWindow(targetWindow, m.sourceWindowName);
    if(windowProxy) {
      if(windowProxy.origin == m.targetOrigin || m.targetOrigin == "*") {
        e = new Porthole.MessageEvent(m.data, m.sourceOrigin, windowProxy);
        windowProxy.dispatchEvent(e)
      }else {
        Porthole.error("Target origin " + windowProxy.origin + " does not match desired target of " + m.targetOrigin)
      }
    }else {
      Porthole.error("Could not find window proxy object on the target window")
    }
  }
}, parseMessage:function(message) {
  if(typeof message == "undefined" || message === null) {
    return null
  }
  params = Porthole.WindowProxy.splitMessageParameters(message);
  var h = {targetOrigin:"", sourceOrigin:"", sourceWindowName:"", data:""};
  h.targetOrigin = unescape(params.targetOrigin);
  h.sourceOrigin = unescape(params.sourceOrigin);
  h.sourceWindowName = unescape(params.sourceWindowName);
  h.targetWindowName = unescape(params.targetWindowName);
  var d = message.split(/&/);
  if(d.length > 3) {
    d.pop();
    d.pop();
    d.pop();
    d.pop();
    h.data = d.join("&")
  }
  return h
}, findWindowProxyObjectInWindow:function(w, sourceWindowName) {
  if(w.RuntimeObject) {
    w = w.RuntimeObject()
  }
  if(w) {
    for(var i in w) {
      try {
        if(w[i] !== null && typeof w[i] == "object" && w[i] instanceof w.Porthole.WindowProxy && w[i].getTargetWindowName() == sourceWindowName) {
          return w[i]
        }
      }catch(e) {
      }
    }
  }
  return null
}, start:function() {
  if(window.addEventListener) {
    window.addEventListener("resize", Porthole.WindowProxyDispatcher.forwardMessageEvent, false)
  }else {
    if(document.body.attachEvent) {
      window.attachEvent("onresize", Porthole.WindowProxyDispatcher.forwardMessageEvent)
    }else {
      Porthole.error("Can't attach resize event")
    }
  }
}};
var lscache = function() {
  var CACHESUFFIX = "-EXP", TOUCHEDSUFFIX = "-LRU";
  var supportsStorage = function() {
    try {
      return!!localStorage.getItem
    }catch(e) {
      return false
    }
  }();
  var supportsJSON = window.JSON != null;
  function expirationKey(key) {
    return key + CACHESUFFIX
  }
  function touchedKey(key) {
    return key + TOUCHEDSUFFIX
  }
  function currentTime() {
    return Math.floor((new Date).getTime() / 6E4)
  }
  function attemptStorage(key, value, time) {
    var purgeSize = 1, sorted = false, firstTry = true, storedKeys = [], storedKey, removeItem;
    retryLoop();
    function retryLoop() {
      try {
        localStorage.setItem(touchedKey(key), currentTime());
        if(time > 0) {
          localStorage.setItem(expirationKey(key), currentTime() + time);
          localStorage.setItem(key, value)
        }else {
          if(time < 0 || time === 0) {
            localStorage.removeItem(touchedKey(key));
            localStorage.removeItem(expirationKey(key));
            localStorage.removeItem(key);
            return
          }else {
            localStorage.setItem(key, value)
          }
        }
      }catch(e) {
        if(e.name === "QUOTA_EXCEEDED_ERR" || e.name == "NS_ERROR_DOM_QUOTA_REACHED") {
          if(storedKeys.length === 0 && !firstTry) {
            localStorage.removeItem(touchedKey(key));
            localStorage.removeItem(expirationKey(key));
            localStorage.removeItem(key);
            return false
          }
          if(firstTry) {
            firstTry = false
          }
          if(!sorted) {
            for(var i = 0, len = localStorage.length;i < len;i++) {
              storedKey = localStorage.key(i);
              if(storedKey.indexOf(TOUCHEDSUFFIX) > -1) {
                var mainKey = storedKey.split(TOUCHEDSUFFIX)[0];
                storedKeys.push({key:mainKey, touched:parseInt(localStorage[storedKey], 10)})
              }
            }
            storedKeys.sort(function(a, b) {
              return a.touched - b.touched
            })
          }
          removeItem = storedKeys.shift();
          if(removeItem) {
            localStorage.removeItem(touchedKey(removeItem.key));
            localStorage.removeItem(expirationKey(removeItem.key));
            localStorage.removeItem(removeItem.key)
          }
          retryLoop()
        }else {
          return
        }
      }
    }
  }
  return{set:function(key, value, time) {
    if(!supportsStorage) {
      return
    }
    if(typeof value != "string") {
      if(!supportsJSON) {
        return
      }
      try {
        value = JSON.stringify(value)
      }catch(e) {
        return
      }
    }
    attemptStorage(key, value, time)
  }, get:function(key) {
    if(!supportsStorage) {
      return null
    }
    function parsedStorage(key) {
      if(supportsJSON) {
        try {
          var value = JSON.parse(localStorage.getItem(key));
          return value
        }catch(e) {
          return localStorage.getItem(key)
        }
      }else {
        return localStorage.getItem(key)
      }
    }
    if(localStorage.getItem(expirationKey(key))) {
      var expirationTime = parseInt(localStorage.getItem(expirationKey(key)), 10);
      if(currentTime() >= expirationTime) {
        localStorage.removeItem(key);
        localStorage.removeItem(expirationKey(key));
        localStorage.removeItem(touchedKey(key));
        return null
      }else {
        localStorage.setItem(touchedKey(key), currentTime());
        return parsedStorage(key)
      }
    }else {
      if(localStorage.getItem(key)) {
        localStorage.setItem(touchedKey(key), currentTime());
        return parsedStorage(key)
      }
    }
    return null
  }, remove:function(key) {
    if(!supportsStorage) {
      return null
    }
    localStorage.removeItem(key);
    localStorage.removeItem(expirationKey(key));
    localStorage.removeItem(touchedKey(key))
  }}
}();
var analyzeFile, applyRules, clearFileRegistry, commonJSFooter, commonJSHeader, context, createIframe, db, define, dispatchTreeDownload, downloadTree, executeFile, fileStorageToken, fileStore, getFormattedPointcuts, getXHR, hostPrefixRegex, hostSuffixRegex, iframeName, jsSuffix, loadModules, namespace, pauseRequired, processCallbacks, require, requireEnsureRegex, requireRegex, reset, responseSlicer, schemaVersion, sendToIframe, sendToXhr, treeNode, undef, userConfig, userModules, xDomainRpc, _db;
var __hasProp = Object.prototype.hasOwnProperty;
userConfig = {};
undef = undef;
schemaVersion = 1;
context = this;
pauseRequired = false;
_db = {};
xDomainRpc = null;
fileStorageToken = "FILEDB";
fileStore = "Inject FileStorage";
namespace = "Inject";
userModules = {};
jsSuffix = /.*?\.js$/;
hostPrefixRegex = /^https?:\/\//;
hostSuffixRegex = /^(.*?)(\/.*|$)/;
iframeName = "injectProxy";
responseSlicer = /^(.+?)[\s]([\w\W]+)$/m;
requireRegex = null;
requireEnsureRegex = null;
requireRegex = /(?:^|[^\w\$_.])require\s*\(\s*("[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*')\s*\)/g;
requireEnsureRegex = /(?:^|[^\w\$_.])require.ensure\s*\(\s*(\[("[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*'|\s*|,)*\])/g;
commonJSHeader = 'with (window) {\n  (function() {\n    var module = {}, exports = {}, require = __INJECT_NS__.require, exe = null;\n    module.id = "__MODULE_ID__";\n    module.uri = "__MODULE_URI__";\n    module.exports = exports;\n    module.setExports = function(xobj) {\n      for (var name in module.exports) {\n        if (module.exports.hasOwnProperty(name)) {\n          throw new Error("module.setExports() failed: Module Exports has already been defined");\n        }\n      }\n      module.exports = xobj;\n      return module.exports;\n    }\n    exe = function(module, exports, require) {\n      __POINTCUT_BEFORE__';
commonJSFooter = "    __POINTCUT_AFTER__\n  };\n  exe.call(module, module, exports, require);\n  return module.exports;\n})();\n}";
db = {"module":{"create":function(moduleId) {
  var registry;
  registry = _db.moduleRegistry;
  if(!registry[moduleId]) {
    return registry[moduleId] = {"exports":null, "path":null, "file":null, "amd":false, "loading":false, "rulesApplied":false, "requires":[], "staticRequires":[], "exec":null, "pointcuts":{"before":[], "after":[]}}
  }
}, "getExports":function(moduleId) {
  var registry, _ref, _ref2;
  registry = _db.moduleRegistry;
  if((_ref = registry[moduleId]) != null ? _ref.exports : void 0) {
    return registry[moduleId].exports
  }
  if((_ref2 = registry[moduleId]) != null ? _ref2.exec : void 0) {
    registry[moduleId].exec();
    registry[moduleId].exec = null;
    return registry[moduleId].exports
  }
  return false
}, "setExports":function(moduleId, exports) {
  var registry;
  registry = _db.moduleRegistry;
  db.module.create(moduleId);
  return registry[moduleId].exports = exports
}, "getPointcuts":function(moduleId) {
  var registry, _ref;
  registry = _db.moduleRegistry;
  if((_ref = registry[moduleId]) != null ? _ref.pointcuts : void 0) {
    return registry[moduleId].pointcuts
  }
}, "setPointcuts":function(moduleId, pointcuts) {
  var registry;
  registry = _db.moduleRegistry;
  db.module.create(moduleId);
  return registry[moduleId].pointcuts = pointcuts
}, "getRequires":function(moduleId) {
  var registry, _ref;
  registry = _db.moduleRegistry;
  if((_ref = registry[moduleId]) != null ? _ref.requires : void 0) {
    return registry[moduleId].requires
  }
}, "setRequires":function(moduleId, requires) {
  var registry;
  registry = _db.moduleRegistry;
  db.module.create(moduleId);
  return registry[moduleId].requires = requires
}, "getStaticRequires":function(moduleId) {
  var registry, _ref;
  registry = _db.moduleRegistry;
  if((_ref = registry[moduleId]) != null ? _ref.staticRequires : void 0) {
    return registry[moduleId].staticRequires
  }
}, "setStaticRequires":function(moduleId, staticRequires) {
  var registry;
  registry = _db.moduleRegistry;
  db.module.create(moduleId);
  return registry[moduleId].staticRequires = staticRequires
}, "getRulesApplied":function(moduleId) {
  var registry, _ref;
  registry = _db.moduleRegistry;
  if((_ref = registry[moduleId]) != null ? _ref.rulesApplied : void 0) {
    return registry[moduleId].rulesApplied
  }else {
    return false
  }
}, "setRulesApplied":function(moduleId, rulesApplied) {
  var registry;
  registry = _db.moduleRegistry;
  db.module.create(moduleId);
  return registry[moduleId].rulesApplied = rulesApplied
}, "getPath":function(moduleId) {
  var registry, _ref;
  registry = _db.moduleRegistry;
  if((_ref = registry[moduleId]) != null ? _ref.path : void 0) {
    return registry[moduleId].path
  }else {
    return false
  }
}, "setPath":function(moduleId, path) {
  var registry;
  registry = _db.moduleRegistry;
  db.module.create(moduleId);
  return registry[moduleId].path = path
}, "getFile":function(moduleId) {
  var file, path, registry, token, _ref;
  registry = _db.moduleRegistry;
  path = db.module.getPath(moduleId);
  token = "" + fileStorageToken + schemaVersion + path;
  if((_ref = registry[moduleId]) != null ? _ref.file : void 0) {
    return registry[moduleId].file
  }
  if(userConfig.fileExpires === 0) {
    return false
  }
  file = lscache.get(token);
  if(file && typeof file === "string" && file.length) {
    db.module.setFile(moduleId, file);
    return file
  }
  return false
}, "setFile":function(moduleId, file) {
  var path, registry, token;
  registry = _db.moduleRegistry;
  db.module.create(moduleId);
  registry[moduleId].file = file;
  path = db.module.getPath(moduleId);
  token = "" + fileStorageToken + schemaVersion + path;
  return lscache.set(token, file, userConfig.fileExpires)
}, "clearAllFiles":function() {
  var data, moduleId, registry, _results;
  registry = _db.moduleRegistry;
  _results = [];
  for(moduleId in registry) {
    if(!__hasProp.call(registry, moduleId)) {
      continue
    }
    data = registry[moduleId];
    data.file = null;
    _results.push(data.loading = false)
  }
  return _results
}, "getAmd":function(moduleId) {
  var registry, _ref;
  registry = _db.moduleRegistry;
  if((_ref = registry[moduleId]) != null ? _ref.amd : void 0) {
    return registry[moduleId].amd
  }else {
    return false
  }
}, "setAmd":function(moduleId, isAmd) {
  var registry;
  registry = _db.moduleRegistry;
  db.module.create(moduleId);
  return registry[moduleId].amd = isAmd
}, "getLoading":function(moduleId) {
  var registry, _ref;
  registry = _db.moduleRegistry;
  if((_ref = registry[moduleId]) != null ? _ref.loading : void 0) {
    return registry[moduleId].loading
  }else {
    return false
  }
}, "setLoading":function(moduleId, loading) {
  var registry;
  registry = _db.moduleRegistry;
  db.module.create(moduleId);
  return registry[moduleId].loading = loading
}}, "txn":{"create":function() {
  var id;
  id = _db.transactionRegistryCounter++;
  _db.transactionRegistry[id] = 0;
  return id
}, "add":function(txnId) {
  return _db.transactionRegistry[txnId]++
}, "subtract":function(txnId) {
  return _db.transactionRegistry[txnId]--
}, "get":function(txnId) {
  return _db.transactionRegistry[txnId]
}, "remove":function(txnId) {
  _db.transactionRegistry[txnId] = null;
  return delete _db.transactionRegistry[txnId]
}}, "queue":{"load":{"add":function(item) {
  return _db.loadQueue.push(item)
}, "get":function() {
  return _db.loadQueue
}, "clear":function() {
  return _db.loadQueue = []
}}, "rules":{"add":function(item) {
  _db.rulesQueue.push(item);
  return _db.rulesQueueDirty = true
}, "get":function() {
  if(_db.rulesQueueDirty) {
    _db.rulesQueueDirty = false;
    _db.rulesQueue.sort(function(a, b) {
      return b.weight - a.weight
    })
  }
  return _db.rulesQueue
}, "size":function() {
  return _db.rulesQueue.length
}}, "file":{"add":function(moduleId, item) {
  if(!_db.fileQueue[moduleId]) {
    !(_db.fileQueue[moduleId] = [])
  }
  return _db.fileQueue[moduleId].push(item)
}, "get":function(moduleId) {
  if(_db.fileQueue[moduleId]) {
    return _db.fileQueue[moduleId]
  }else {
    return[]
  }
}, "clear":function(moduleId) {
  if(_db.fileQueue[moduleId]) {
    return _db.fileQueue[moduleId] = []
  }
}}, "amd":{"add":function(moduleId, item) {
  if(!_db.amdQueue[moduleId]) {
    !(_db.amdQueue[moduleId] = [])
  }
  return _db.amdQueue[moduleId].push(item)
}, "get":function(moduleId) {
  if(_db.amdQueue[moduleId]) {
    return _db.amdQueue[moduleId]
  }else {
    return[]
  }
}, "clear":function(moduleId) {
  if(_db.amdQueue[moduleId]) {
    return _db.amdQueue[moduleId] = []
  }
}}}};
treeNode = function() {
  function treeNode(value) {
    this.value = value;
    this.children = [];
    this.parent = null;
    this.left = null;
    this.right = null
  }
  treeNode.prototype.getValue = function() {
    return this.value
  };
  treeNode.prototype.addChild = function(node) {
    var rightChild;
    if(this.children.length > 0) {
      rightChild = this.children[this.children.length - 1];
      node.setLeft(rightChild);
      rightChild.setRight(node)
    }
    this.children.push(node);
    return node.setParent(this)
  };
  treeNode.prototype.getChildren = function() {
    return this.children
  };
  treeNode.prototype.setLeft = function(node) {
    return this.left = node
  };
  treeNode.prototype.getLeft = function() {
    return this.left
  };
  treeNode.prototype.setRight = function(node) {
    return this.right = node
  };
  treeNode.prototype.getRight = function() {
    return this.right
  };
  treeNode.prototype.setParent = function(node) {
    return this.parent = node
  };
  treeNode.prototype.getParent = function() {
    return this.parent
  };
  treeNode.prototype.postOrder = function() {
    var currentNode, direction, output, _results;
    output = [];
    currentNode = this;
    direction = null;
    _results = [];
    while(currentNode) {
      if(currentNode.getChildren().length > 0 && direction !== "up") {
        direction = "down";
        currentNode = currentNode.getChildren()[0];
        continue
      }
      output.push(currentNode.getValue());
      if(currentNode.getRight()) {
        direction = "right";
        currentNode = currentNode.getRight();
        continue
      }
      if(currentNode.getParent()) {
        direction = "up";
        currentNode = currentNode.getParent();
        continue
      }
      return output
    }
    return _results
  };
  return treeNode
}();
reset = function() {
  _db = {"moduleRegistry":{}, "transactionRegistry":{}, "transactionRegistryCounter":0, "loadQueue":[], "rulesQueue":[], "fileQueue":[], "amdQueue":[]};
  return userConfig = {"moduleRoot":null, "fileExpires":1440, "xd":{"inject":null, "xhr":null}}
};
reset();
clearFileRegistry = function(version) {
  var key, keys, token, _i, _len;
  if(version == null) {
    version = schemaVersion
  }
  token = "" + fileStorageToken + version;
  keys = [];
  for(var i = 0;i < localStorage.length;i++) {
    var key = localStorage.key(i);
    if(key.indexOf(token) !== -1) {
      keys.push(key)
    }
  }
  for(_i = 0, _len = keys.length;_i < _len;_i++) {
    key = keys[_i];
    localStorage.removeItem(key)
  }
  if(version === schemaVersion) {
    return db.module.clearAllFiles()
  }
};
createIframe = function() {
  var iframe, localSrc, src, trimHost, _ref, _ref2;
  src = userConfig != null ? (_ref = userConfig.xd) != null ? _ref.xhr : void 0 : void 0;
  localSrc = userConfig != null ? (_ref2 = userConfig.xd) != null ? _ref2.inject : void 0 : void 0;
  if(!src) {
    throw new Error("Configuration requires xd.remote to be defined");
  }
  if(!localSrc) {
    throw new Error("Configuration requires xd.local to be defined");
  }
  trimHost = function(host) {
    host = host.replace(hostPrefixRegex, "").replace(hostSuffixRegex, "$1");
    return host
  };
  iframe = document.createElement("iframe");
  iframe.name = iframeName;
  iframe.src = src + "#xhr";
  iframe.style.width = iframe.style.height = "1px";
  iframe.style.right = iframe.style.bottom = "0px";
  iframe.style.position = "absolute";
  iframe.id = iframeName;
  document.body.insertBefore(iframe, document.body.firstChild);
  xDomainRpc = new Porthole.WindowProxy(userConfig.xd.xhr + "#xhr", iframeName);
  return xDomainRpc.addEventListener(function(event) {
    var item, pieces, queue, _i, _len;
    if(trimHost(event.origin) !== trimHost(userConfig.xd.xhr)) {
      return
    }
    if(event.data === "READY") {
      xDomainRpc.postMessage("READYREADY");
      pauseRequired = false;
      queue = db.queue.load.get();
      db.queue.load.clear();
      for(_i = 0, _len = queue.length;_i < _len;_i++) {
        item = queue[_i];
        item()
      }
    }else {
      pieces = event.data.match(responseSlicer);
      return processCallbacks(pieces[1], pieces[2])
    }
  })
};
getFormattedPointcuts = function(moduleId) {
  var afterCut, beforeCut, cut, cuts, definition, fn, noop, pointcuts, _i, _j, _len, _len2, _ref, _ref2;
  cuts = db.module.getPointcuts(moduleId);
  beforeCut = [";"];
  afterCut = [";"];
  _ref = cuts.before;
  for(_i = 0, _len = _ref.length;_i < _len;_i++) {
    cut = _ref[_i];
    beforeCut.push(cut.toString().match(/.*?\{([\w\W]*)\}/m)[1])
  }
  _ref2 = cuts.after;
  for(_j = 0, _len2 = _ref2.length;_j < _len2;_j++) {
    cut = _ref2[_j];
    afterCut.push(cut.toString().match(/.*?\{([\w\W]*)\}/m)[1])
  }
  beforeCut.push(";");
  afterCut.push(";");
  return{before:beforeCut.join(";\n"), after:afterCut.join(";\n")};
  noop = function() {
  };
  pointcuts = {"before":noop, "after":noop};
  if(!userModules[module]) {
    return pointcuts
  }
  definition = userModules[module];
  for(cut in pointcuts) {
    fn = pointcuts[cut];
    if(definition[cut]) {
      pointcuts[cut] = definition[cut]
    }
  }
  return pointcuts
};
dispatchTreeDownload = function(id, tree, node, callback) {
  var afterDownload;
  tree.addChild(node);
  db.txn.add(id);
  afterDownload = function() {
    var moduleId;
    db.txn.subtract(id);
    if(db.txn.get(id) === 0) {
      db.txn.remove(id);
      moduleId = node.getValue();
      if(db.module.getAmd(moduleId) === true && db.module.getExports(moduleId) === false) {
        return db.queue.amd.add(moduleId, callback)
      }else {
        return callback()
      }
    }
  };
  if(db.module.getLoading(node.getValue()) === false) {
    return context.setTimeout(function() {
      return downloadTree(node, afterDownload)
    })
  }else {
    return db.queue.file.add(node.getValue(), afterDownload)
  }
};
loadModules = function(modList, callback) {
  var execute, id, moduleId, node, tree, _i, _len, _results;
  if(modList.length === 0) {
    context.setTimeout(function() {
      return callback.apply(context, [])
    });
    return
  }
  tree = new treeNode(null);
  id = db.txn.create();
  execute = function() {
    var executionOrder, exports, moduleId, _i, _j, _len, _len2;
    executionOrder = tree.postOrder();
    for(_i = 0, _len = executionOrder.length;_i < _len;_i++) {
      moduleId = executionOrder[_i];
      if(moduleId === null) {
        continue
      }
      executeFile(moduleId)
    }
    exports = [];
    for(_j = 0, _len2 = modList.length;_j < _len2;_j++) {
      moduleId = modList[_j];
      exports.push(db.module.getExports(moduleId))
    }
    callback.apply(context, exports)
  };
  _results = [];
  for(_i = 0, _len = modList.length;_i < _len;_i++) {
    moduleId = modList[_i];
    node = new treeNode(moduleId);
    _results.push(dispatchTreeDownload(id, tree, node, execute))
  }
  return _results
};
downloadTree = function(tree, callback) {
  var download, file, moduleId, onDownloadComplete;
  moduleId = tree.getValue();
  if(db.module.getRulesApplied() === false) {
    applyRules(moduleId)
  }
  onDownloadComplete = function(moduleId, file) {
    var id, node, req, requires, _i, _len;
    db.module.setFile(moduleId, file);
    analyzeFile(moduleId);
    requires = db.module.getRequires(moduleId);
    id = db.txn.create();
    for(_i = 0, _len = requires.length;_i < _len;_i++) {
      req = requires[_i];
      node = new treeNode(req);
      dispatchTreeDownload(id, tree, node, callback)
    }
    if(db.txn.get(id) === 0) {
      db.txn.remove(id);
      if(db.module.getAmd(moduleId) === true && db.module.getExports(moduleId) === false) {
        return db.queue.amd.add(moduleId, function() {
          return context.setTimeout(callback)
        })
      }else {
        return context.setTimeout(callback)
      }
    }
  };
  download = function() {
    db.module.setLoading(moduleId, true);
    if(userConfig.xd.inject && userConfig.xd.xhr) {
      return sendToIframe(moduleId, processCallbacks)
    }else {
      return sendToXhr(moduleId, processCallbacks)
    }
  };
  db.queue.file.add(moduleId, onDownloadComplete);
  if(db.module.getLoading(moduleId)) {
    return
  }
  file = db.module.getFile(moduleId);
  if(file && file.length > 0) {
    return processCallbacks(moduleId, file)
  }else {
    return download()
  }
};
processCallbacks = function(moduleId, file) {
  var cb, cbs, _i, _len, _results;
  db.module.setLoading(moduleId, false);
  cbs = db.queue.file.get(moduleId);
  db.queue.file.clear(moduleId);
  _results = [];
  for(_i = 0, _len = cbs.length;_i < _len;_i++) {
    cb = cbs[_i];
    _results.push(cb(moduleId, file))
  }
  return _results
};
analyzeFile = function(moduleId) {
  var file, match, reqs, require, requires, staticReq, uniques, _i, _len, _ref;
  requires = [];
  uniques = {};
  require = function(item) {
    if(uniques[item] !== true) {
      requires.push(item)
    }
    return uniques[item] = true
  };
  require.ensure = function(items) {
    var item, _i, _len, _results;
    _results = [];
    for(_i = 0, _len = items.length;_i < _len;_i++) {
      item = items[_i];
      _results.push(require(item))
    }
    return _results
  };
  reqs = [];
  file = db.module.getFile(moduleId);
  while(match = requireRegex.exec(file)) {
    reqs.push(match[0])
  }
  while(match = requireEnsureRegex.exec(file)) {
    reqs.push(match[0])
  }
  if((reqs != null ? reqs.length : void 0) > 0) {
    eval(reqs.join(";"))
  }
  _ref = db.module.getStaticRequires(moduleId);
  for(_i = 0, _len = _ref.length;_i < _len;_i++) {
    staticReq = _ref[_i];
    if(uniques[staticReq] !== true) {
      requires.push(staticReq)
    }
    uniques[staticReq] = true
  }
  return db.module.setRequires(moduleId, requires)
};
applyRules = function(moduleId) {
  var isMatch, pointcuts, rule, workingPath, _i, _len, _ref, _ref2, _ref3;
  workingPath = moduleId;
  pointcuts = {before:[], after:[]};
  _ref = db.queue.rules.get();
  for(_i = 0, _len = _ref.length;_i < _len;_i++) {
    rule = _ref[_i];
    isMatch = typeof rule.key === "string" ? rule.key.toLowerCase() === workingPath.toLowerCase() : rule.key.test(workingPath);
    if(isMatch === false) {
      continue
    }
    workingPath = typeof rule.path === "string" ? rule.path : rule.path(workingPath);
    if(rule != null ? (_ref2 = rule.pointcuts) != null ? _ref2.before : void 0 : void 0) {
      pointcuts.before.push(rule.pointcuts.before)
    }
    if(rule != null ? (_ref3 = rule.pointcuts) != null ? _ref3.after : void 0 : void 0) {
      pointcuts.after.push(rule.pointcuts.after)
    }
  }
  if(workingPath.indexOf("/") !== 0) {
    if(typeof userConfig.moduleRoot === "undefined") {
      throw new Error("Module Root must be defined");
    }else {
      if(typeof userConfig.moduleRoot === "string") {
        workingPath = "" + userConfig.moduleRoot + workingPath
      }else {
        if(typeof userConfig.moduleRoot === "function") {
          workingPath = userConfig.moduleRoot(workingPath)
        }
      }
    }
  }
  if(!jsSuffix.test(workingPath)) {
    workingPath = "" + workingPath + ".js"
  }
  db.module.setPath(moduleId, workingPath);
  db.module.setPointcuts(moduleId, pointcuts);
  return db.module.setRulesApplied(moduleId, true)
};
executeFile = function(moduleId) {
  var cuts, exports, footer, header, path, requiredModuleId, runCmd, text, _i, _j, _len, _len2, _ref, _ref2;
  if(db.module.getExports(moduleId)) {
    return
  }
  _ref = db.module.getRequires(moduleId);
  for(_i = 0, _len = _ref.length;_i < _len;_i++) {
    requiredModuleId = _ref[_i];
    executeFile(requiredModuleId)
  }
  _ref2 = db.module.getStaticRequires(moduleId);
  for(_j = 0, _len2 = _ref2.length;_j < _len2;_j++) {
    requiredModuleId = _ref2[_j];
    executeFile(requiredModuleId)
  }
  cuts = getFormattedPointcuts(moduleId);
  path = db.module.getPath(moduleId);
  text = db.module.getFile(moduleId);
  header = commonJSHeader.replace(/__MODULE_ID__/g, moduleId).replace(/__MODULE_URI__/g, path).replace(/__INJECT_NS__/g, namespace).replace(/__POINTCUT_BEFORE__/g, cuts.before);
  footer = commonJSFooter.replace(/__POINTCUT_AFTER__/g, cuts.after);
  runCmd = "" + header + "\n" + text + "\n" + footer + "\n//@ sourceURL=" + path;
  try {
    exports = context.eval(runCmd)
  }catch(err) {
    throw err;
  }
  return db.module.setExports(moduleId, exports)
};
sendToXhr = function(moduleId, callback) {
  var path, xhr;
  path = db.module.getPath(moduleId);
  xhr = getXHR();
  xhr.open("GET", path);
  xhr.onreadystatechange = function() {
    if(xhr.readyState === 4 && xhr.status === 200) {
      return callback.call(context, moduleId, xhr.responseText)
    }
  };
  return xhr.send(null)
};
sendToIframe = function(moduleId, callback) {
  var path;
  path = db.module.getPath(moduleId);
  return xDomainRpc.postMessage("" + moduleId + " " + path)
};
getXHR = function() {
  var xmlhttp;
  xmlhttp = false;
  if(typeof XMLHttpRequest !== "undefined") {
    try {
      xmlhttp = new XMLHttpRequest
    }catch(errorWin) {
      xmlhttp = false
    }
  }
  if(!xmlhttp && typeof window.createRequest !== "undefined") {
    try {
      xmlhttp = new window.createRequest
    }catch(errorCr) {
      xmlhttp = false
    }
  }
  if(!xmlhttp) {
    try {
      xmlhttp = new ActiveXObject("Msxml2.XMLHTTP")
    }catch(msErrOne) {
      try {
        xmlhttp = new ActiveXObject("Microsoft.XMLHTTP")
      }catch(msErrTwo) {
        xmlhttp = false
      }
    }
  }
  if(!xmlhttp) {
    throw new Error("Could not create an xmlHttpRequest Object");
  }
  return xmlhttp
};
require = function(moduleId) {
  var mod;
  mod = db.module.getExports(moduleId);
  if(mod === false) {
    throw new Error("" + moduleId + " not loaded");
  }
  return mod
};
require.ensure = function(moduleList, callback) {
  var ensureExecutionCallback, run;
  if(userConfig.xd.xhr != null && !xDomainRpc && !pauseRequired) {
    createIframe();
    pauseRequired = true
  }
  ensureExecutionCallback = function() {
    var exports, module;
    module = {};
    exports = {};
    module.exports = exports;
    return callback.call(context, require, module, exports)
  };
  run = function() {
    return loadModules(moduleList, ensureExecutionCallback)
  };
  if(pauseRequired) {
    return db.queue.load.add(run)
  }else {
    return run()
  }
};
require.setModuleRoot = function(root) {
  if(typeof root === "string" && root.lastIndexOf("/") !== root.length) {
    root = "" + root + "/"
  }
  return userConfig.moduleRoot = root
};
require.setExpires = function(expires) {
  return userConfig.fileExpires = expires
};
require.setCrossDomain = function(local, remote) {
  userConfig.xd.inject = local;
  return userConfig.xd.xhr = remote
};
require.clearCache = function(version) {
  return clearFileRegistry(version)
};
require.manifest = function(manifest) {
  var item, ruleSet, rules, _results;
  _results = [];
  for(item in manifest) {
    if(!__hasProp.call(manifest, item)) {
      continue
    }
    rules = manifest[item];
    ruleSet = {path:rules.path || null, pointcuts:{before:rules.before || null, after:rules.after || null}};
    _results.push(require.addRule(item, ruleSet))
  }
  return _results
};
require.addRule = function(match, weight, ruleSet) {
  var usePath;
  if(weight == null) {
    weight = null
  }
  if(ruleSet == null) {
    ruleSet = null
  }
  if(ruleSet === null) {
    ruleSet = weight;
    weight = db.queue.rules.size()
  }
  if(typeof ruleSet === "string") {
    usePath = ruleSet;
    ruleSet = {path:usePath}
  }
  return db.queue.rules.add({key:match, weight:weight, pointcuts:ruleSet.pointcuts || null, path:ruleSet.path || null})
};
require.run = function(moduleId) {
  if(db.module.getFile(moduleId) === false) {
    return require.ensure([moduleId], function() {
    })
  }else {
    db.module.setExports(moduleId, null);
    return executeFile(moduleId)
  }
};
define = function(moduleId, deps, callback) {
  var dep, strippedDeps, _i, _len;
  if(typeof moduleId !== "string") {
    callback = deps;
    deps = moduleId;
    moduleId = null
  }
  if(Object.prototype.toString.call(deps) !== "[object Array]") {
    callback = deps;
    deps = []
  }
  if(moduleId) {
    db.module.setAmd(moduleId, true)
  }
  strippedDeps = [];
  for(_i = 0, _len = deps.length;_i < _len;_i++) {
    dep = deps[_i];
    if(dep !== "exports" && dep !== "require" && dep !== "module") {
      strippedDeps.push(dep)
    }
  }
  db.module.setStaticRequires(moduleId, strippedDeps);
  return require.ensure(strippedDeps, function(require, module, exports) {
    var amdCallback, amdCallbackQueue, args, count, dep, item, returnValue, _j, _k, _l, _len2, _len3, _len4, _ref;
    args = [];
    for(_j = 0, _len2 = deps.length;_j < _len2;_j++) {
      dep = deps[_j];
      switch(dep) {
        case "require":
          args.push(require);
          break;
        case "exports":
          args.push(exports);
          break;
        case "module":
          args.push(module);
          break;
        default:
          args.push(require(dep))
      }
    }
    if(typeof callback === "function") {
      returnValue = callback.apply(context, args);
      count = 0;
      _ref = module["exports"];
      for(_k = 0, _len3 = _ref.length;_k < _len3;_k++) {
        item = _ref[_k];
        count++
      }
      if(count === 0 && typeof returnValue !== "undefined") {
        exports = returnValue
      }
    }else {
      if(typeof callback === "object") {
        exports = callback
      }
    }
    if(moduleId) {
      db.module.setExports(moduleId, exports);
      amdCallbackQueue = db.queue.amd.get(moduleId);
      for(_l = 0, _len4 = amdCallbackQueue.length;_l < _len4;_l++) {
        amdCallback = amdCallbackQueue[_l];
        amdCallback()
      }
      return db.queue.amd.clear(moduleId)
    }
  })
};
define["amd"] = {"jQuery":true};
context["require"] = require;
context["define"] = define;
context["Inject"] = {"require":require, "define":define, "reset":reset, "debug":function() {
  return typeof console !== "undefined" && console !== null ? console.dir(_db) : void 0
}};
context["require"]["ensure"] = require.ensure;
context["require"]["setModuleRoot"] = require.setModuleRoot;
context["require"]["setExpires"] = require.setExpires;
context["require"]["setCrossDomain"] = require.setCrossDomain;
context["require"]["clearCache"] = require.clearCache;
context["require"]["manifest"] = require.manifest;
context["require"]["run"] = require.run;
}).call(this)
