/*jshint unused:false */
/*global window:true, XMLHttpRequest:true, ActiveXObject:true, console:true */
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
    User configuration options
    @property {string} moduleRoot Base path for all module includes
      @see InjectCore.setModuleRoot
    @property {number} fileExpires Time (in seconds) for how long to preserve
      items in cache @see InjectCore.setExpires
    @property {boolean} useSuffix Specify true to append file suffix when
      resolving an identifier to a URL.  @see RulesEngine.resolveFile
    @property {object} xd Contains properties related to cross-domain requests
    @property {string|null} xd.relayFile URL to easyXDM provider document
    @property {object} debug
    @property {boolean} debug.sourceMap Specify true to enable source
      mapping @see Executor
    @property {boolean} debug.logging Specify true to enable logging
      @see debugLog
    @type {object}
    @global
 */
var userConfig = {
  moduleRoot: null,
  fileExpires: 0,
  useSuffix: true,
  xd: {
    relayFile: null
  },
  debug: {
    sourceMap: false,
    logging: false
  }
};

/**
    The local scope
    @global
 */
var context = this;

/**
    Mappings for module => handling defined by the user.
    @global
  */
var userModules = {};

/**
    Returns whether or not 'property' exists in 'object' as a Function
    or Object.
    @param {object} object The object to inspect.
    @param {*} property The property to assert exists in 'object'
    @return {Boolean} true if 'property' exists in 'object', and false
      otherwise.
    @function
    @global
 */
var isHostMethod = function (object, property) {
  // Return if typeof is 'function', 'object' or 'unknown' (can occur for IE)
  // See http://stackoverflow.com/questions/10982739/typeof-returning-unknown-in-ie
  var t = typeof object[property];
  return t === 'function' || (!!(t === 'object' && object[property])) || t === 'unknown';
};

/**
    Calls the specified function in the specified scope.
    @param {Function} fn The function to call.
    @param {object} scope The scope to execute the function in.
    @return {*} The result of calling fn.
    @function
    @global
 */
function proxy(fn, scope) {
  if (!scope) {
    throw new Error('proxying requires a scope');
  }
  if (!fn) {
    throw new Error('proxying requires a function');
  }
  return function () {
    return fn.apply(scope, arguments);
  };
}

/**
    Apples fn to each item in given collection.
    @param {*[]} collection An array of arbitrary elements.
    @param {Function} fn A function that takes one argument.
      Each element from 'collection' will be passed to 'fn'.
    @function
    @global
 */
function each(collection, fn) {
  for (var i = 0, len = collection.length; i < len; i++) {
    fn(collection[i]);
  }
}

function guid() {
  return ('INJECT_xxxxxxxx_xxxx_4xxx_yxxx_xxxxxxxxxxxx').replace(/[xy]/g, function(c) {
    var r = Math.random() * 16|0, v = c == 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });
}

/**
    Function for logging debug output.
    @type {Function}
    @global
 */
var debugLog = function () {};
// TODO: more robust logging solution
(function () {
  var logs = [];
  var canLog = (typeof(console) !== 'undefined' && console.log  && typeof(console.log) === 'function');
  var doLog = function (origin, message) {
    if (userConfig.debug && userConfig.debug.logging) {
      console.log('## ' + origin + ' ##' + '\n' + message);
    }
  };
  if (canLog) {
    debugLog = doLog;
  }
})();

/**
    Methods to add and remove events based on browser capabilities.
    @param {Object} obj A target object to add or remove a listener.
    @param {String} evt The event type.
    @param {Function} fn The target function to add or remove.
    @param {Boolean} capture Use capturing if supported.
    @function
    @global
 */
var addListener, removeListener;
(function(win) {
  if (win.addEventListener) {
    addListener = function(el, evt, fn, capture) {
      el.addEventListener(evt, fn, capture || false);
    };
    removeListener = function(el, evt, fn, capture) {
      el.removeEventListener(evt, fn, capture || false);
    };
  }
  else {
    addListener = function(el, evt, fn) {
      el.attachEvent('on' + evt, fn);
    };
    removeListener = function(el, evt, fn) {
      el.detachEvent('on' + evt, fn);
    };
  }
}(window));
