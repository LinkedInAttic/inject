/*global context:true */
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
 * Communicator handles the logic for
 * downloading and executing required files and dependencies
 * @file
 */
var Communicator;
(function () {
  var AsStatic = Fiber.extend(function () {
    
    var alreadyListening = false;
    var socket;
    var socketInProgress;
    var socketQueue = [];
    var socketQueueCache = {};
    
    function resolveSocketQueue() {
      var lQueue = socketQueue;
      socketQueue = [];
      socketQueueCache = {};
      for (var i = 0, len = lQueue.length; i < len; i++) {
        sendMessage(socket.contentWindow, userConfig.xd.relayFile, 'fetch', {
          url: lQueue[i]
        });
      }
    }
    
    function addSocketQueue(lUrl) {
      if (!socketQueueCache[lUrl]) {
        socketQueueCache[lUrl] = 1;
        socketQueue.push(lUrl);
      }
    }
    
    function beginListening() {
      if (alreadyListening) {
        return;
      }
      alreadyListening = true;
    
      addListener(window, 'message', function(e) {
        var commands, command, params;
      
        if (!userConfig.xd.relayFile) {
          return;
        }
      
        if (getDomainName(e.origin) !== getDomainName(userConfig.xd.relayFile)) {
          return;
        }
      
        commands = e.data.split(/:/);
        command = commands.shift();

        switch (command) {
        case 'ready':
          socketInProgress = false;
          resolveSocketQueue();
          break;
        case 'fetchFail':
        case 'fetchOk':
          params = JSON.parse(commands.join(':'));
          resolveCompletedFile(params.url, params.status, params.responseText);
        }
      });
    }
    
    /**
     * Clear the records to socket connections and
     * downloaded files
     * @function
     * @private
     */
    function clearCaches() {
      downloadCompleteQueue = {};
    }

    /**
     * Write file contents to local storage
     * @function
     * @param {string} url - url to use as a key to store file content
     * @param {string} contents file contents to be stored in cache
     * @private
     * @returns a function adhearing to the lscache set() method
     */
    function writeToCache(url, contents) {
      // lscache and passthrough
      if (userConfig.fileExpires > 0) {
        return lscache.set(url, contents, userConfig.fileExpires);
      }
      else {
        return null;
      }
    }

    /**
     * read cached file contents from local storage
     * @function
     * @param {string} url - url key that the content is stored under
     * @private
     * @returns the content that is stored under the url key
     *
     */
    function readFromCache(url) {
      // lscache and passthrough
      if (userConfig.fileExpires > 0) {
        return lscache.get(url);
      }
      else {
        return null;
      }
    }

    /**
     * function that resolves all callbacks that are associated
     * to the loaded file
     * @function
     * @param {string} url - The location of the module that has loaded
     * @param {int} statusCode - The result of the attempt to load the file at url
     * @param {string} contents - The contents that were loaded from url
     * @private
     */
    function resolveCompletedFile(url, statusCode, contents) {
      statusCode = 1 * statusCode;
      debugLog('Communicator (' + url + ')', 'status ' + statusCode + '. Length: ' +
          ((contents) ? contents.length : 'NaN'));

      // write cache
      if (statusCode === 200 && !userConfig.xd.relayFile) {
        writeToCache(url, contents);
      }
      
      // all non-200 codes create a runtime error that includes the error code
      if (statusCode !== 200) {
        contents = 'throw new Error(\'Error ' + statusCode + ': Unable to retrieve ' + url + '\');';
      }

      // locate all callbacks associated with the URL
      each(downloadCompleteQueue[url], function (cb) {
        cb(contents);
      });
      downloadCompleteQueue[url] = [];
    }

    /**
     * Creates a standard xmlHttpRequest
     * @function
     * @param {string} url - url where the content is located
     * @private
     */
    function sendViaIframe(url) {
      beginListening();
      if (socket && !socketInProgress) {
        sendMessage(socket.contentWindow, userConfig.xd.relayFile, 'fetch', {
          url: url
        });
      }
      else if (socket && socketInProgress) {
        addSocketQueue(url);
        return;
      }
      else {
        socketInProgress = true;
        addSocketQueue(url);
        var iframeSrc = userConfig.xd.relayFile;
        
        socket = document.createElement('iframe');
        iframeSrc += (iframeSrc.indexOf('?') < 0) ? '?' : '&';
        iframeSrc += 'injectReturn=' + encodeURIComponent(location.href);
        socket.src = iframeSrc;
        
        socket.style.visibility = 'hidden';
        socket.style.border = 0;
        socket.style.width = '1px';
        socket.style.height = '1px';
        socket.style.left = '-5000px';
        socket.style.top = '-5000px';
        socket.style.opacity = '0';

        window.setTimeout(function() {
          if (!document.body.firsChild) {
            document.body.appendChild(socket);
          }
          else {
            document.body.insertBefore(socket, document.body.firstChild);
          }
        });
      }
    }

    /**
     * Get contents via xhr for cross-domain requests
     * @function
     * @param {string} url - url where the content is located
     * @private
     */
    function sendViaXHR(url) {
      var xhr = getXHR();
      xhr.open('GET', url);
      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          resolveCompletedFile(url, xhr.status, xhr.responseText);
        }
      };
      xhr.send(null);
    }

    return {
      /**
       * The Communicator object is meant to be instantiated once, and have its
       * reference assigned to a location outside of the closure.
       * @constructs Communicator
       */
      init: function () {
        this.clearCaches();
      },

      /**
       * clear list of socket connections and list of downloaded files
       * @method Communicator.clearCaches
       * @public
       */
      clearCaches: function () {
        clearCaches();
      },

      /**
       * A noop for just running the callback. Useful for a passthrough
       * operation
       * @param {string} moduleId - The id of the module to be fetched
       * @param {string} url - The location of the script to be fetched
       * @param {object} callback - The function callback to execute after the file is retrieved and loaded
       * @public
       */
      noop: function (moduleId, url, callback) {
        callback('');
      },

      /**
       * retrieve file via download or cache keyed by the given url
       * @method Communicator.get
       * @param {string} moduleId - The id of the module to be fetched
       * @param {string} url - The location of the script to be fetched
       * @param {object} callback - The function callback to execute after the file is retrieved and loaded
       * @public
       */
      get: function (moduleId, url, callback) {
        if (!downloadCompleteQueue[url]) {
          downloadCompleteQueue[url] = [];
        }

        debugLog('Communicator (' + url + ')', 'requesting');

        if (!userConfig.xd.relayFile) {
          var cachedResults = readFromCache(url);
          if (cachedResults) {
            debugLog('Communicator (' + url + ')', 'retireved from cache. length: ' + cachedResults.length);
            callback(cachedResults);
            return;
          }
        }

        debugLog('Communicator (' + url + ')', 'queued');
        if (downloadCompleteQueue[url].length) {
          downloadCompleteQueue[url].push(callback);
          debugLog('Communicator (' + url + ')', 'request already in progress');
          return;
        }
        downloadCompleteQueue[url].push(callback);
        
        // local xhr
        if (!userConfig.xd.relayFile) {
          sendViaXHR(url);
          return;
        }
        
        // remote xhr
        sendViaIframe(url);
      }
    };
  });
  Communicator = new AsStatic();
})();
