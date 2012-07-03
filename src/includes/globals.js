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
  	sourceMap: false
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

function bind(fn, scope) {
  return function() {
    return fn.apply(scope, arguments);
  }
}

function proxy(fn, scope) {
  return function() {
    return fn.apply(scope, arguments);
  }
}

function memoizeAsync(fn, cbLocation, memoKey) {
  fn.memoize = {
    hashes: {}
  };
  return function() {
    var args = Array.prototype.slice.call(arguments);
    var memoArgs = Array.prototype.slice.call(arguments);
    var hash = memoKey.apply(this, args);
    var queue = [];
    var callback = args[cbLocation];
    var triggerQueue = function() {
      // store arguments
      fn.memoize.hashes[hash] = Array.prototype.slice.call(arguments);
      for (var i = 0, len = queue.length; i < len; i++) {
        queue[i].apply(this, fn.memoize.hashes[hash]);
      }
    };
    
    // callback sub
    memoArgs.splice(cbLocation, 1, triggerQueue);

    // memo check
    if (hash in fn.memoize.hashes) {
      return callback.apply(this, fn.memoize.hashes[hash]);
    }
    else {
      queue.push(callback);
      return fn.apply(this, memoArgs);
    }
  }
}

function memoize(fn, memoKey) {
  fn.memoize = {
    hashes: {}
  };
  return function() {
    var args = Array.prototype.slice.call(arguments);
    var hash = memoKey.apply(this, args);
    return (hash in fn.memoize.hashes) ? fn.memoize.hashes[hash] : fn.memoize.hashes[hash] = fn.apply(this, arguments);
  };
}

function each(collection, fn) {
  for (var i = 0, len = collection.length; i < len; i++) {
    fn(collection[i]);
  }
}