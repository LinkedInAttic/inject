/** Content-Type: multipart/related; boundary="_IE_LOCALSTORAGE_SHIM"

--_IE_LOCALSTORAGE_SHIM
Content-Location:storeone
Content-Transfer-Encoding:base64

R0lGODlhAQABAIABAP///wAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==

--_IE_LOCALSTORAGE_SHIM
Content-Location:storetwo
Content-Transfer-Encoding:base64

R0lGODlhAQABAIABAP///wAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==

--_IE_LOCALSTORAGE_SHIM--
@license
*/
(function() {
  var DEBUG = true,
      DONT_ENUMERATE = ['getItem', 'setItem', 'removeItem', 'key', 'clear'],
      iframe = document.createElement('iframe'),
      src = document.getElementById('ie-localstorage-shim');

  //reference the tiniest gif ever via mhtml (http://probablyprogramming.com/2009/03/15/the-tiniest-gif-ever)
  iframe.src = src ? 'mhtml:' + src.getAttribute('src', -1) + '!storeone' : '/favicon.ico';
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
        storageElement = doc.createElement('storageelement'),
        _storedKeys = [];


    storageElement.id = id;//setting an id increases the speed of access, significantly.
    storageElement.addBehavior('#default#userData');
    doc.documentElement.appendChild(storageElement);



//    TODO: use previouslyStoredDocs to load previously stored keys in to _storedKeys
//    storageElement.load(id);
//    var previouslyStoredDocs = storageElement['XMLDocument'];
//    previouslyStoredDocs.documentElement.attributes.length

    var localStorageShim = {
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
          storageElement.save(id);
          localStorage.length = _storedKeys.push(key);
        }catch(e) {
          //throw {name: 'QUOTA_EXCEEDED_ERR', message:'localStorage quota exceeded.'};//TODO: rethrow w/ proper error message //-2147217407
          if (DEBUG) throw e;
        }
      },
      'removeItem': function(key) {
        key = cleanStorageKey(key);

        try {
          storageElement.removeAttribute(key);
          storageElement.save(id);

          //remove from internal cache... no indexOf in IE :(
          for (var x = _storedKeys.length-1; x >= 0; x--) {
            if (_storedKeys[x] === key) {
              _storedKeys.splice(x,1);
            }
          }
          localStorageShim.length = _storedKeys.length;
        }catch(e) {
          if (DEBUG) throw e;
        }
      },
      'key': function(index) {
        return uncleanStorageKey(_storedKeys[index]);
      },
      'clear': function() {
        for (var x = _storedKeys.length-1, key; x >= 0; x--) {
          key = localStorageShim.key(x);
          key && localStorageShim.removeItem(key);
        }
      },
      'length': _storedKeys.length
    };
    window['localStorage'] = window['localStorage'] || localStorageShim;
  }
}());