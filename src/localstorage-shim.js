/*
Content-Type: multipart/related; boundary="_IE_LOCALSTORAGE_SHIM"

--_IE_LOCALSTORAGE_SHIM
Content-Location:storeone
Content-Transfer-Encoding:base64

R0lGODlhAQABAIABAP///wAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==

--_IE_LOCALSTORAGE_SHIM
Content-Location:storetwo
Content-Transfer-Encoding:base64

PGh0bWw+PGhlYWQ+PHRpdGxlPjwvdGl0bGU+PC9oZWFkPjxib2R5PjxiIGlkPSJsb2NhbHN0b3JhZ2UtaWVzaGltLWluamVjdCIgY2xhc3M9InVzZXJEYXRhIiBzdHlsZT0iYmVoYXZpb3I6dXJsKCcjZGVmYXVsdCN1c2VyRGF0YScpIj48L2I+PHNjcmlwdD4oZnVuY3Rpb24gZ2V0VXNlckRhdGEoKXt2YXIgaWQ9ImxvY2Fsc3RvcmFnZS1pZXNoaW0taW5qZWN0IixiPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGlkKTt0cnl7Yi5sb2FkKGlkKX1jYXRjaChlKXtzZXRUaW1lb3V0KGdldFVzZXJEYXRhLDApfX0oKSk8L3NjcmlwdD48L2JvZHk+PC9odG1sPg==

--_IE_LOCALSTORAGE_SHIM--
*/
/*
Inject
Copyright 2011 Jakob Heuser

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
(function() {
  var DEBUG = false,
      DONT_ENUMERATE = ['getItem', 'setItem', 'removeItem', 'key', 'clear'],
      iframe = document.createElement('iframe'),
      src = document.getElementById('ie-localstorage-shim'),
      localStorageShim = {},
      CustomError;

  //custom error. used to rethrow QUOTA_EXCEEDED_ERR errors
  CustomError = function(name, msg) { this.name = name; this.message = msg;};
  CustomError.prototype = new Error;

  //reference the tiniest gif ever via mhtml (http://probablyprogramming.com/2009/03/15/the-tiniest-gif-ever)
  iframe.src = src ? 'mhtml:' + src.getAttribute('src', -1) + '!storetwo' : '/favicon.ico';
  iframe.style.display = 'none';

  iframe.attachEvent('onload', createLocalStorageObject);
  src.parentNode.insertBefore(iframe,src);

  function cleanStorageKey(key) {
    return key ? 'ie' + key.replace(/[^-._0-9A-Za-z\xb7\xc0-\xd6\xd8-\xf6\xf8-\u037d-\u1fff\u200c-\u200d\u203f\u2040\u2070-\u218f]/g, '-' ) : key ;
  }
  function uncleanStorageKey(key) {
    //for the moment we can only get ride of the 'ie' prefix
    return key ? key.replace(/^ie/,'') : key;
  }
  function createLocalStorageObject() {
    var doc = iframe.contentWindow.document,
        id = 'localstorage-ieshim-inject',
        storageElement = doc.getElementById(id),
        _storedKeys = [];

    function syncStoredKeys() {
      var storageAttr;
      _storedKeys = [];
      try{
        storageAttr = storageElement.XMLDocument.documentElement.attributes;
        for (var x = 0, l = storageAttr.length; x<l; x++) {
          _storedKeys.push(storageAttr[x].nodeName);
        }
      }catch(e) {
        //unable to pre-populate _storedKeys. This may be the first time userData is used or it may not be ready yet.
        if (DEBUG) throw e;
      }
      localStorageShim.length = _storedKeys.length;
    }
    localStorageShim = {
      'getItem': function(key) {
        var val = null;
        key = cleanStorageKey(key);
        try{
          storageElement.load(id);
          val =  storageElement.getAttribute(key);
        }catch(e) {
          if (DEBUG) throw e;
        }

        return val;
      },
      'setItem': function(key, value) {
        key = cleanStorageKey(key);
        try{
          storageElement.setAttribute(key, value.toString());//.toString() per https://developer.mozilla.org/en/DOM/Storage
          syncStoredKeys();
          storageElement.save(id);
        }catch(e) {
          throw new CustomError('QUOTA_EXCEEDED_ERR', 'userData quota exceeded.');//-2147217407
        }
        syncStoredKeys();//adds to internal cache and updates length
      },
      'removeItem': function(key) {
        key = cleanStorageKey(key);
        try {
          storageElement.removeAttribute(key);
          syncStoredKeys();//updates internal store and localStorage.length
          storageElement.save(id);
        }catch(e) {
          if (DEBUG) throw e;
        }
      },
      'key': function(index) {
        syncStoredKeys();
        return uncleanStorageKey(_storedKeys[index]);
      },
      'clear': function() {
        syncStoredKeys();//updates internal store and localStorage.length
        for (var x = _storedKeys.length-1, key; x >= 0; x--) {
          key = localStorageShim.key(x);
          key && localStorageShim.removeItem(key);
        }
      },
      'length': _storedKeys.length
    };
    window['localStorage'] = window['localStorage'] || localStorageShim;
    syncStoredKeys();
  }
}());