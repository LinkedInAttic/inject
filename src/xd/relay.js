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
 * The relay.html file's purpose is to sit on the remote location
 * (such as a CDN) and make XHR requests on behalf of the parent
 * page running Inject.
**/

// lscache is loaded at the top of this page
// postmessage.js is loaded at the top of this page

var returnUrl = decodeURIComponent(location.href.match(/[&?#/]injectReturn=(.*?)(?:#|&|$)/)[1]);

window.setTimeout(function() {
  sendMessage(window.parent, returnUrl, 'ready', {
    url: location.href
  });
});

addListener(window, 'message', function(e) {
  var commands, command, params, xhr, cachedFile;
  
  if (e.origin === 'null' || getDomainName(e.origin) !== getDomainName(returnUrl)) {
    return;
  }
  
  commands = e.data.split(/:/);
  command = commands.shift();
  
  switch (command) {
  case 'fetch':
    params = JSON.parse(commands.join(':'));
    cachedFile = readFromCache(params.url, params.cacheLife);
    if (cachedFile) {
      sendMessage(e.source, e.origin, 'fetchOk', {
        url: params.url,
        status: 200,
        responseText: cachedFile,
        cached: true
      });
      return;
    }
    xhr = getXHR();
    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4) {
        if (xhr.status == 200) {
          writeToCache(params.url, xhr.responseText, params.cacheLife);
          sendMessage(e.source, e.origin, 'fetchOk', {
            url: params.url,
            status: xhr.status,
            responseText: xhr.responseText
          });
        }
        else {
          sendMessage(e.source, e.origin, 'fetchFail', {
            url: params.url,
            status: xhr.status,
            responseText: null
          });
        }
      }
    };
    xhr.open('GET', params.url, true);
    xhr.send(null);
    break;
  default:
    throw new Error('unsupported: ' + command);
  }
});

/*
 * Write file contents to local storage
 * @function
 * @param {string} url - url to use as a key to store file content
 * @param {string} contents file contents to be stored in cache
 * @private
 * @returns a function adhearing to the lscache set() method
 **/
function writeToCache(url, contents, life) {
  // lscache and passthrough
  if (life > 0) {
    return lscache.set(url, contents, life);
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
function readFromCache(url, life) {
  // lscache and passthrough
  if (life > 0) {
    return lscache.get(url);
  }
  else {
    return null;
  }
}
