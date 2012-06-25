// executor JS
var Executor;
(function() {
  var AsStatic = Class.extend(function() {
    return {
      init: function() {},
      runJavaScript: function(code) {},
      runModule: function(moduleId) {}
    };
  });
  Executor = new AsStatic();
})();