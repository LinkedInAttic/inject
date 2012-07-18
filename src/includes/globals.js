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

// user configuration options (see reset)
var userConfig = {
  moduleRoot: null,
  fileExpires: 300,
  useSuffix: true,
  xd: {
  	relayFile: null,
  	relaySwf: null
  },
  debug: {
  	sourceMap: false,
    logging: true
  }
};

// context is our local scope. Should be "window"
var context = this;

// any mappings for module => handling defined by the user
var userModules = {};

// a placeholder for the easyXDM lib if loaded
var easyXdm = false;

// an XHR reference, loaded once
var isHostMethod = function(object, property) {
  var t = typeof object[property];
  return t == 'function' || (!!(t == 'object' && object[property])) || t == 'unknown';
};

var getXhr = (function(){
  if (isHostMethod(window, "XMLHttpRequest")) {
    return function(){
        return new XMLHttpRequest();
    };
  }
  else {
    var item = (function(){
      var list = ["Microsoft", "Msxml2", "Msxml3"], i = list.length;
      while (i--) {
        try {
          item = list[i] + ".XMLHTTP";
          var obj = new ActiveXObject(item);
          return item;
        } 
        catch (e) {}
      }
    }());
    return function(){
      return new ActiveXObject(item);
    };
  }
}());

function proxy(fn, scope) {
  if (!scope) {
    throw new Error("proxying requires a scope");
  }
  if (!fn) {
    throw new Error("proxying requires a function");
  }
  return function() {
    return fn.apply(scope, arguments);
  }
}

function each(collection, fn) {
  for (var i = 0, len = collection.length; i < len; i++) {
    fn(collection[i]);
  }
}

var debugLog = function() {};
// TODO: more robust logging solution
(function() {
  var logs = [];
  var canLog = (console && console.log && typeof(console.log) === "function");
  var doLog = function(origin, message) {
    if (userConfig.debug.logging) {
      console.log("## "+ origin +" ##" + "\n" + message);
    };
  }
  if (canLog) {
    debugLog = doLog;
  }
})();