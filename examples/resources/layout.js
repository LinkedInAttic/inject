// an XHR reference, loaded once
var layout_isHostMethod = function(object, property) {
  var t = typeof object[property];
  return t == 'function' || (!!(t == 'object' && object[property])) || t == 'unknown';
};

var layout_getXhr = (function(){
  if (layout_isHostMethod(window, "XMLHttpRequest")) {
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

var sandbox = function(lines) {
  var sandbox = document.createElement("div");
  sandbox.id = "sandbox";
  sandbox.innerHTML = lines.join("\n");
  document.getElementsByTagName("body")[0].appendChild(sandbox);
};

(function() {
  var body = document.getElementsByTagName("body")[0];
  var xhr = layout_getXhr();
  xhr.open("GET", "resources/header.html");
  xhr.onreadystatechange = function() {
    if (xhr.readyState === 4) {
      var node = document.createElement("div");
      var insertAt = body.firstChild;
      node.innerHTML = xhr.responseText;
      while(node.firstChild) {
        body.insertBefore(node.firstChild, insertAt);
      }
    }
  };
  xhr.send(null);
})();


// run the sandbox!
(function() {
  // <link rel="stylesheet" type="text/css" media="screen" href="layout.css" />
  var css = document.createElement("link");
  css.rel = "stylesheet";
  css.type = "text/css";
  css.media = "screen";
  css.href = "resources/layout.css";

  document.getElementsByTagName("head")[0].appendChild(css);

  var code = document.getElementById("code");
  code.wrap = "off";
  if (code) {
    eval(code.value+"\n//@ sourceURL=inject-sandbox.js");
  }
})();