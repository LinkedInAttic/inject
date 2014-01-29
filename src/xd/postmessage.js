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

var reURI = /^((http.?:)\/\/([^:\/\s]+)(:\d+)*)/; // returns groups for protocol (2), domain (3) and port (4) 

function addListener(el, evt, fn) {
  if (window.addEventListener) {
    el.addEventListener(evt, fn, false);
  }
  else {
    el.attachEvent('on' + evt, fn);
  }
}

function getDomainName(url) {
  return url.match(reURI)[3];
}

function sendMessage(target, targetsUrl, command, params) {
  if (!params) {
    params = {};
  }
  
  params = JSON.stringify(params);
  target.postMessage([command, params].join(':'), targetsUrl);
}

var getXHR = (function() {
  var XMLHttpFactories = [
    function () { return new XMLHttpRequest(); },
    function () { return new ActiveXObject("Msxml2.XMLHTTP"); },
    function () { return new ActiveXObject("Msxml3.XMLHTTP"); },
    function () { return new ActiveXObject("Microsoft.XMLHTTP"); }
  ];

  var xmlhttp = false;
  for (var i=0;i<XMLHttpFactories.length;i++) {
    try {
      XMLHttpFactories[i]();
      xmlhttp = XMLHttpFactories[i];
    }
    catch (e) {
      continue;
    }
    break;
  }

  return xmlhttp;
}());