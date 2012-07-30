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

var Communicator;
(function() {
  var AsStatic = Class.extend(function() {
    var pauseRequired = false;

    var socketConnectionQueue;
    var downloadCompleteQueue;

    var socket;

    function clearCaches() {
      socketConnectionQueue = [];
      downloadCompleteQueue = {};      
    }

    function writeToCache(url, contents) {
      // lscache and passthrough
      return lscache.set(url, contents, userConfig.fileExpires);
    }

    function readFromCache(url) {
      // lscache and passthrough
      return lscache.get(url);
    }

    function trimHost(host) {
      host = host.replace(HOST_PREFIX_REGEX, "").replace(HOST_SUFFIX_REGEX, "$1");
      return host;
    }

    // when a file completes, resolve all callbacks in its queue
    function resolveCompletedFile(moduleId, url, statusCode, contents) {
      statusCode = 1*statusCode;
      debugLog("Communicator ("+url+")", "status "+statusCode+". Length: "+((contents) ? contents.length : "NaN"));

      // write cache
      if (statusCode === 200) {
        writeToCache(url, contents);
      }

      // locate all callbacks associated with the URL
      each(downloadCompleteQueue[url], function(cb) {
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

    // set up our easyXDM socket
    function createSocket() {
      var relayFile = userConfig.xd.relayFile;
      var relaySwf = userConfig.xd.relaySwf || "";
      relayFile += (relayFile.indexOf("?") >= 0) ? "&" : "?";
      relayFile += "swf="+relaySwf;

      socket = new easyXDM.Socket({
        remote: relayFile,
        swf: relaySwf,
        onMessage: function(message, origin) {
          if (typeof(userConfig.moduleRoot) === "string" && trimHost(userConfig.moduleRoot) !== trimHost(origin)) {
            return;
          }
          var pieces = message.split("__INJECT_SPLIT__");
          // pieces[0] moduleId
          // pieces[1] file URL
          // pieces[2] status code
          // pieces[3] file contents
          resolveCompletedFile(pieces[0], pieces[1], pieces[2], pieces[3]);
        },
        onReady: function() {
          pauseRequired = false;
          each(socketConnectionQueue, function(cb) {
            cb();
          });
          socketConnectionQueue = [];
        }
      });
    }

    // these are our two senders, either via easyXDM or via standard xmlHttpRequest
    function sendViaIframe(moduleId, url) {
      socket.postMessage(moduleId + "__INJECT_SPLIT__" + url);
    }
    function sendViaXHR(moduleId, url) {
      var xhr = getXhr();
      xhr.open("GET", url);
      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
          resolveCompletedFile(moduleId, url, xhr.status, xhr.responseText);
        }
      };
      xhr.send(null);
    }

    return {
      init: function() {
        this.clearCaches();
      },
      clearCaches: function() {
        clearCaches();
      },
      get: function(moduleId, url, callback) {
        if (!downloadCompleteQueue[url]) {
          downloadCompleteQueue[url] = [];
        }

        debugLog("Communicator ("+url+")", "requesting");

        var cachedResults = readFromCache(url);
        if (cachedResults) {
          debugLog("Communicator ("+url+")", "retireved from cache. length: "+cachedResults.length);
          callback(cachedResults);
          return;
        }

        debugLog("Communicator ("+url+")", "queued");
        if (downloadCompleteQueue[url].length) {
          downloadCompleteQueue[url].push(callback);
          debugLog("Communicator ("+url+")", "request already in progress");
          return;
        }
        downloadCompleteQueue[url].push(callback);

        if (userConfig.xd.relayFile && !socket && !pauseRequired) {
          pauseRequired = true;
          window.setTimeout(createSocket);
        }

        var socketQueuedFn = function() {
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