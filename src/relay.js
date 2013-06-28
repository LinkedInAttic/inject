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
  if (relayConfig.fileExpires > 0) {
    return lscache.set(url, contents, relayConfig.fileExpires);
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
  if (relayConfig.fileExpires > 0) {
    return lscache.get(url);
  }
  else {
    return null;
  }
}


/**
 * The relay.html file's purpose is to sit on the remote location
 * (such as a CDN) and make XHR requests on behalf of the parent
 * page running Inject. It uses easyXDM's simple socket connection,
 * with a __DOUBLE_UNDERSCORE__ delimiter to split fields.
 * @file Contains the relay.html file to be placed on a remote server
**/

    // the SWF's location is passed in to us from the parent page as a parameter
var swfLocation = location.href.match(/swf=(.*?)(&|$)/)[1],
    
    // the queue object contains requests that are pending until the cross domain
    // setup is complete
    queue = [],

    // a function that returns an XHR object
    getXhr,

    // a flag that indicates if the socket is ready
    socketReady = false,

    // the easyXDM connection object
    socket,

    // the token used to split and reassemble requests in cross domain comm
    INJECT_TOKEN = "__INJECT_SPLIT__";

/**
 * trim a provided string down to its hostname and port
 * @function
 * @param {string} host - the host to trim down
 * @returns a string minus path information and protocol
 */
function trimHost(host) {
  return host.replace(hostPrefixRegex, "").replace(hostSuffixRegex, "$1");
}





/**
 * makes an XmlHttpRequest and posts the message back through
 * the socket object. If at the time of invocation, the socket
 * is not ready, the requested params are queued until the
 * socket is able to perform two way communication.
 * Args are provided in the form of:
 *    [0]: moduleId
 *    [1]: module URL
 * And it invokes the postMessage with the following args:
 *    [0]: moduleId (echored from input)
 *    [1]: module URL (echoed from input)
 *    [2]: XHR status code
 *    [3]: XHR message body
 * @function
 * @param {array} args - the collection of arguments
 */
function doXmlHttpRequest(args) {
  var xhr = getXhr();
  xhr.open("GET", args[1]);


  xhr.onreadystatechange = function() {
    if (xhr.readyState === 4) {
      /**
       * send a return response back via the socket
       * this object is queued if the socket is not ready
       * @inner
       */
      var sendMessageNow = function() {

        writeToCache(args[1], xhr.responseText); 
        socket.postMessage([
          args[0], // moduleId
          args[1], // URL
          xhr.status,
          xhr.responseText
        ].join(INJECT_TOKEN));
      };

      // if the socket is ready, send
      // else queue
      if (socketReady) {
        sendMessageNow();
      }
      else {
        queue.push(sendMessageNow);
      }
    }
  };
  xhr.send(null);
}

function sendFromCache(args, cachedData){
	var sendCacheMessage = function() {
		socket.postMessage([
          args[0], // moduleId
          args[1], // URL
          '200',
          cachedData
        ].join(INJECT_TOKEN));
	};
  if (socketReady) {
    sendCacheMessage();
  }
  else {
    queue.push(sendCacheMessage);
  }
}

/**
 * Test if a property exists in the object, is a method, and is properly
 * bound. This is used in things such as getXhr() to test if the 
 * XMLHttpRequest is a native window method or not.
 * @function
 * @param {object} object - the item to search for a given method
 * @param {string} property - the name of the property to search and verify
 * @returns boolean true if the method exists and is a methof
 */
function isHostMethod(object, property) {
  var t = typeof object[property];
  return t == 'function' || (!!(t == 'object' && object[property])) || t == 'unknown';
}

/**
 * A closure to return a function to get an XHR object
 * It tests for various XHR implementations, returning the most effective one
 * @function
 * @returns an XHR object based on browser support
 */
getXhr = (function(){
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

// define a global Inject object, which can house the easyXDM library.
// easyXDM requires the Inject library to be located in the same location
// on both the Inject install and the relay install
window.Inject = {
  easyXDM: easyXDM
};
easyXDM.noConflict("Inject");

// create the easyXDM socket
socket = new window.Inject.easyXDM.Socket({
  swf: swfLocation,
  onMessage:function(message, origin) {
    // if it doesn't match, do not execute
    if (ALLOWED_DOMAIN && trimHost(origin) !== trimHost(ALLOWED_DOMAIN)) {
      return;
    }
    
    var messageArgs = message.split(INJECT_TOKEN),
      cachedResults = readFromCache(messageArgs[1]);
    
    if (cachedResults) {
      sendFromCache(messageArgs, cachedResults);
    } 
    else {
      // split and make the XHR request
      doXmlHttpRequest(messageArgs);
    }
  },
  onReady: function() {
    // flag the socket as ready, and then run all items in the queue
    socketReady = true;
    if (queue.length > 0) {
      for (var i = 0, len = queue.length; i < len; i++) {
        queue[i]();
      }
    }
  }
});