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
var Communicator = Fiber.extend(function() {
  return {
    /**
     * The Communicator object is meant to be instantiated once, and have its
     * reference assigned to a location outside of the closure.
     * @constructs Communicator
     */
    init: function (env) {
      this.env = env;
      this.clearCaches();
      this.alreadyListening = false;
      this.socket = null;
      this.socketInProgress = false;
      this.socketQueue = [];
      this.socketQueueCache = {};
      this.downloadCompleteQueue = {};
    },

    /**
     * clear list of socket connections and list of downloaded files
     * @method Communicator.clearCaches
     * @public
     */
    clearCaches: function () {
      self.downloadCompleteQueue = {};
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
      if (!this.downloadCompleteQueue[url]) {
        this.downloadCompleteQueue[url] = [];
      }

      debugLog('Communicator (' + url + ')', 'requesting');

      if (!this.env.config.relayFile) {
        var cachedResults = this.readFromCache(url);
        if (cachedResults) {
          debugLog('Communicator (' + url + ')', 'retireved from cache. length: ' + cachedResults.length);
          callback(cachedResults);
          return;
        }
      }

      debugLog('Communicator (' + url + ')', 'queued');
      if (this.downloadCompleteQueue[url].length) {
        this.downloadCompleteQueue[url].push(callback);
        debugLog('Communicator (' + url + ')', 'request already in progress');
        return;
      }
      this.downloadCompleteQueue[url].push(callback);
      
      // local xhr
      if (!this.env.config.relayFile) {
        this.sendViaXHR(url);
        return;
      }
      
      // remote xhr
      this.sendViaIframe(url);
    },
  
    addSocketQueue: function(lUrl) {
      if (!this.socketQueueCache[lUrl]) {
        this.socketQueueCache[lUrl] = 1;
        this.socketQueue.push(lUrl);
      }
    },
  
    beginListening: function() {
      var self = this;
      if (this.alreadyListening) {
        return;
      }
      this.alreadyListening = true;
    
      this.listenFor(window, 'message', function(e) {
        var commands, command, params;
    
        if (!self.env.config.relayFile) {
          return;
        }
    
        if (self.getDomainName(e.origin) !== self.getDomainName(self.env.config.relayFile)) {
          return;
        }
    
        commands = e.data.split(/:/);
        command = commands.shift();

        switch (command) {
        case 'ready':
          self.socketInProgress = false;
          (function() {
            var lQueue = self.socketQueue;
            self.socketQueue = [];
            self.socketQueueCache = {};
            for (var i = 0, len = lQueue.length; i < len; i++) {
              self.sendMessage(self.socket.contentWindow, self.env.config.relayFile, 'fetch', {
                url: lQueue[i]
              });
            }
          }());
          break;
        case 'fetchFail':
        case 'fetchOk':
          params = JSON.parse(commands.join(':'));
          self.resolveCompletedFile(params.url, params.status, params.responseText);
        }
      });
    },

    /**
     * read cached file contents from local storage
     * @function
     * @param {string} url - url key that the content is stored under
     * @private
     * @returns the content that is stored under the url key
     *
     */
    readFromCache: function(url) {
      // lscache and passthrough
      if (this.env.config.expires > 0) {
        return this.env.lscache.get(url);
      }
      else {
        return null;
      }
    },

    /**
     * function that resolves all callbacks that are associated
     * to the loaded file
     * @function
     * @param {string} url - The location of the module that has loaded
     * @param {int} statusCode - The result of the attempt to load the file at url
     * @param {string} contents - The contents that were loaded from url
     * @private
     */
    resolveCompletedFile: function(url, statusCode, contents) {
      statusCode = 1 * statusCode;
      debugLog('Communicator (' + url + ')', 'status ' + statusCode + '. Length: ' +
          ((contents) ? contents.length : 'NaN'));

      // write cache
      if (statusCode === 200 && !this.env.config.relayFile && this.env.config.expires > 0) {
        this.env.lscache.set(url, contents, this.env.config.expires);
      }
    
      // all non-200 codes create a runtime error that includes the error code
      if (statusCode !== 200) {
        contents = 'throw new Error(\'Error ' + statusCode + ': Unable to retrieve ' + url + '\');';
      }

      // locate all callbacks associated with the URL
      each(this.downloadCompleteQueue[url], function (cb) {
        cb(contents);
      });
      this.downloadCompleteQueue[url] = [];
    },

    /**
     * Creates a standard xmlHttpRequest
     * @function
     * @param {string} url - url where the content is located
     * @private
     */
    sendViaIframe: function(url) {
      this.beginListening();
      var self = this;
      if (this.socket && !this.socketInProgress) {
        this.sendMessage(this.socket.contentWindow, this.env.config.relayFile, 'fetch', {
          url: url
        });
      }
      else if (this.socket && this.socketInProgress) {
        this.addSocketQueue(url);
        return;
      }
      else {
        this.socketInProgress = true;
        this.addSocketQueue(url);
        var iframeSrc = this.env.config.relayFile;
      
        this.socket = document.createElement('iframe');
        iframeSrc += (iframeSrc.indexOf('?') < 0) ? '?' : '&';
        iframeSrc += 'injectReturn=' + encodeURIComponent(location.href);
        this.socket.src = iframeSrc;
      
        this.socket.style.visibility = 'hidden';
        this.socket.style.border = 0;
        this.socket.style.width = '1px';
        this.socket.style.height = '1px';
        this.socket.style.left = '-5000px';
        this.socket.style.top = '-5000px';
        this.socket.style.opacity = '0';

        window.setTimeout(function() {
          if (!document.body.firsChild) {
            document.body.appendChild(self.socket);
          }
          else {
            document.body.insertBefore(self.socket, document.body.firstChild);
          }
        });
      }
    },

    /**
     * Get contents via xhr for cross-domain requests
     * @function
     * @param {string} url - url where the content is located
     * @private
     */
    sendViaXHR: function(url) {
      var self = this;
      var xhr = getXHR();
      xhr.open('GET', url);
      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          self.resolveCompletedFile(url, xhr.status, xhr.responseText);
        }
      };
      xhr.send(null);
    }
  };
});
