var reURI = /^((http.?:)\/\/([^:\/\s]+)(:\d+)*)/; // returns groups for protocol (2), domain (3) and port (4) 

function getDomainName(url) {
  return url.match(reURI)[3];
}

function listenFor(obj, evt, fn) {
  if (obj.addEventListener) {
    obj.addEventListener(evt, fn);
  }
  else {
    obj.attachEvent('on' + evt, fn);
  }
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