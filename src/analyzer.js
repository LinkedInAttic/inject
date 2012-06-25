// analyzer JS
var Analyzer;
(function() {
  var AsStatic = Class.extend(function() {
    return {
      init: function() {},
      extractRequires: function(file) {},
      getFunctionArgs: function(fn) {}
    };
  });
  Analyzer = new AsStatic();
})();