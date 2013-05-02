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
**/
var Communicator;
(function () {
  var AsStatic = Fiber.extend(function () {
    var pauseRequired = false;

    var socketConnectionQueue;
    var downloadCompleteQueue;

    var socket;

    /**
    * Clear the records to socket connections and
    * downloaded files
    * @function
    * @private
    **/
    function clearCaches() {
      socketConnectionQueue = [];
      downloadCompleteQueue = {};
    }

    /**
    * Write file contents to local storage
    * @function
    * @param {string} url - url to use as a key to store file content
    * @param {string} contents file contents to be stored in cache
    * @private
    * @returns a function adhearing to the lscache set() method
    **/
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
    **/
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
    * Utility function to cleanup Host name by removing leading
    * http or https string
    * @function
    * @param {string} host - The host name to trim.
    * @private
    * @returns hostname without leading http or https string
    **/
    function trimHost(host) {
      host = host.replace(HOST_PREFIX_REGEX, '').replace(HOST_SUFFIX_REGEX, '$1');
      return host;
    }

    /**
    * function that resolves all callbacks that are associated
    * to the loaded file
    * @function
    * @param {string} moduleId - The id of the module that has been loaded
    * @param {string} url - The location of the module that has loaded
    * @param {int} statusCode - The result of the attempt to load the file at url
    * @param {string} contents - The contents that were loaded from url
    * @private
    **/
    function resolveCompletedFile(moduleId, url, statusCode, contents) {
      statusCode = 1 * statusCode;
      debugLog('Communicator (' + url + ')', 'status ' + statusCode + '. Length: ' +
          ((contents) ? contents.length : 'NaN'));

      // write cache
      if (statusCode === 200) {
        writeToCache(url, contents);
      }

      // locate all callbacks associated with the URL
      each(downloadCompleteQueue[url], function (cb) {
        if (statusCode !== 200) {
          if (Executor) {
            Executor.flagModuleAsBroken(moduleId);
          }
          cb(false);
        }
        else {
          cb(contents);
        }
      });
      downloadCompleteQueue[url] = [];
    }

    /**
    * Creates an easyXDM socket
    * @function
    * @private
    * @returns and instance of a easyXDM Socket
    **/
    function createSocket() {
      var relayFile = userConfig.xd.relayFile;
      var relaySwf = userConfig.xd.relaySwf || '';
      relayFile += (relayFile.indexOf('?') >= 0) ? '&' : '?';
      relayFile += 'swf=' + relaySwf;

      socket = new easyXDM.Socket({
        remote: relayFile,
        swf: relaySwf,
        onMessage: function (message, origin) {
          if (typeof(userConfig.moduleRoot) === 'string' && trimHost(userConfig.moduleRoot) !== trimHost(origin)) {
            return;
          }
          var pieces = message.split('__INJECT_SPLIT__');
          // pieces[0] moduleId
          // pieces[1] file URL
          // pieces[2] status code
          // pieces[3] file contents
          resolveCompletedFile(pieces[0], pieces[1], pieces[2], pieces[3]);
        },
        onReady: function () {
          pauseRequired = false;
          each(socketConnectionQueue, function (cb) {
            cb();
          });
          socketConnectionQueue = [];
        }
      });
    }

    /**
    * Creates a standard xmlHttpRequest
    * @function
    * @param {string} moduleId - id of the module for the request
    * @param {string} url - url where the content is located
    * @private
    **/
    function sendViaIframe(moduleId, url) {
      socket.postMessage(moduleId + '__INJECT_SPLIT__' + url);
    }

    /**
    * Get contents via xhr for cross-domain requests
    * @function
    * @param {string} moduleId - id of the module for the request
    * @param {string} url - url where the content is located
    * @private
    **/
    function sendViaXHR(moduleId, url) {
      var xhr = getXhr();
      xhr.open('GET', url);
      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          resolveCompletedFile(moduleId, url, xhr.status, xhr.responseText);
        }
      };
      xhr.send(null);
    }

    return {
      /**
      *   The Communicator object is meant to be instantiated once, and have its
      *   reference assigned to a location outside of the closure.
      *   @constructs Communicator
      **/
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

        var cachedResults = readFromCache(url);
        if (cachedResults) {
          debugLog('Communicator (' + url + ')', 'retireved from cache. length: ' + cachedResults.length);
          callback(cachedResults);
          return;
        }

        debugLog('Communicator (' + url + ')', 'queued');
        if (downloadCompleteQueue[url].length) {
          downloadCompleteQueue[url].push(callback);
          debugLog('Communicator (' + url + ')', 'request already in progress');
          return;
        }
        downloadCompleteQueue[url].push(callback);

        if (userConfig.xd.relayFile && !socket && !pauseRequired) {
          pauseRequired = true;
          context.setTimeout(createSocket);
        }

        var socketQueuedFn = function () {
          sendViaIframe(moduleId, url);
        };

        if (pauseRequired) {
          socketConnectionQueue.push(socketQueuedFn);
        }
        else {
          if (userConfig.xd.relayFile) {
            sendViaIframe(moduleId, url);
          }
          else {
            sendViaXHR(moduleId, url);
          }
        }
      }
    };
  });
  Communicator = new AsStatic();
})();