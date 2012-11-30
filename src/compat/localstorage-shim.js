/*global document:true, window:true */
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
 * IE-7 localstorage shim. Provides a localstorage polyfill for older
 * browsers using IE's "userData" object. This file works in conjunction
 * with localstorage-assets.txt to provide the full IE7 shim
 * Compatible with IE 6, 7
 * @file
 */
/**
 * we wrap everything in a self executing closure and expose
 * window.localstorage
 */
(function () {
  var DEBUG = false,
      iframe = document.createElement('iframe'),
      src = document.getElementById('ie-localstorage-shim'),
      localStorageShim = {},
      CustomError;

  //custom error. used to rethrow QUOTA_EXCEEDED_ERR errors
  CustomError = function (name, msg) { this.name = name; this.message = msg; };
  CustomError.prototype = new Error();

  /**
   * Creates a localStorage shim object
   * @function localStorageShim.createLocalStorageObject
   * @private
   * @returns localStorageShim
   */
  function createLocalStorageObject() {
    var doc = iframe.contentWindow.document,
        id = 'localstorage-ieshim-inject',
        storageElement = doc.getElementById(id),
        _storedKeys = [];

    /**
     * syncs the keys with the internal key list, and relays it to
     * the iframe object
     * @function localStorageShim.syncStoredKeys
     * @private
     */
    function syncStoredKeys() {
      var storageAttr;
      _storedKeys = [];
      try {
        storageAttr = storageElement.XMLDocument.documentElement.attributes;
        for (var x = 0, l = storageAttr.length; x < l; x++) {
          _storedKeys.push(storageAttr[x].nodeName);
        }
      }
      catch (e) {
        //unable to pre-populate _storedKeys. This may be the first time userData is used or it may not be ready yet.
        if (DEBUG) {
          throw e;
        }
      }
      localStorageShim.length = _storedKeys.length;
    }

    /**
     * This is the localStorage API emulation.
     * @class localStorageShim
     * @public
     */
    localStorageShim = {
      /**
       * Get an item from "localStorage". Loads the object
       * from the iframe's userdata
       * @method localStorageShim.getItem
       * @public
       * @returns {*} result of query
       */
      getItem: function (key) {
        var val = null;
        key = cleanStorageKey(key);
        try {
          storageElement.load(id);
          val =  storageElement.getAttribute(key);
        }
        catch (e) {
          if (DEBUG) {
            throw e;
          }
        }

        return val;
      },

      /**
       * Set an item into "localStorage". Syncs all data back into
       * IE UserData
       * @method localStorageShim.setItem
       * @param {string} key - the key to store under
       * @param {*} value - the value to store
       * @public
       */
      setItem: function (key, value) {
        key = cleanStorageKey(key);
        try {
          storageElement.setAttribute(key, value.toString());//.toString() per https://developer.mozilla.org/en/DOM/Storage
          syncStoredKeys();
          storageElement.save(id);
        }
        catch (e) {
          throw new CustomError('QUOTA_EXCEEDED_ERR', 'userData quota exceeded.');//-2147217407
        }
        syncStoredKeys();//adds to internal cache and updates length
      },

      /**
       * Remove an item from "localStorage" by name
       * @method localStorageShim.removeItem
       * @param {string} key - the name of the key to remove
       * @public
       */
      removeItem: function (key) {
        key = cleanStorageKey(key);
        try {
          storageElement.removeAttribute(key);
          syncStoredKeys();//updates internal store and localStorage.length
          storageElement.save(id);
        }
        catch (e) {
          if (DEBUG) {
            throw e;
          }
        }
      },

      /**
       * return the key of an item in "localStorage" for a given index
       * @method localStorageShim.key
       * @param {int} index - the index to retrieve
       * @public
       * @returns {string} the key at the given index
       */
      key: function (index) {
        syncStoredKeys();
        return uncleanStorageKey(_storedKeys[index]);
      },

      /**
       * Removes all keys from "localStorage"
       * @method localStorageShim.clear
       * @public
       */
      clear: function () {
        syncStoredKeys();//updates internal store and localStorage.length
        for (var x = _storedKeys.length - 1, key; x >= 0; x--) {
          key = localStorageShim.key(x);
          if (key) {
            localStorageShim.removeItem(key);
          }
        }
      },

      /**
       * the length property of "localStorage" updated when keys are saved
       * @name localStorageShim.length
       * @type {int}
       * @public
       */
      length: _storedKeys.length
    };

    /**
     * This is the globally exposed localStorage object when using
     * browsers without native support (IE for example)
     * @global
     * @type {Object}
     * @see localStorageShim
     */
    window['localStorage'] = window['localStorage'] || localStorageShim;
    syncStoredKeys();
  }

  //reference the tiniest gif ever via mhtml (http://probablyprogramming.com/2009/03/15/the-tiniest-gif-ever)
  iframe.src = src ? 'mhtml:' + src.getAttribute('src', -1) + '!storetwo' : '/favicon.ico';
  iframe.style.display = 'none';

  iframe.attachEvent('onload', createLocalStorageObject);
  src.parentNode.insertBefore(iframe, src);

  function cleanStorageKey(key) {
    return key ? 'ie' + key.replace(/[^\-._0-9A-Za-z\xb7\xc0-\xd6\xd8-\xf6\xf8-\u037d-\u1fff\u200c-\u200d\u203f\u2040\u2070-\u218f]/g, '-') : key;
  }
  function uncleanStorageKey(key) {
    //for the moment we can only get ride of the 'ie' prefix
    return key ? key.replace(/^ie/, '') : key;
  }

}());