// analyzer JS
var Inject;
(function() {
  var AsStatic = Class.extend(function() {
    return {
      init: function() {},
      require: function(moduleIdOrList, callback) {},
      ensure: function(moduleList, callback) {},
      run: function(moduleId) {},
      define: function() {
        var args = Array.prototype.slice(arguments, 0);
        // id, dependencies, executionFunction
        // dependencies, executionFunction
        // executionFunction
      },
      setModuleRoot: function(root) {},
      setCrossDomain: function(crossDomainConfig) {},
      clearCache: function() {},
      setExpires: function(seconds) {},
      reset: function() {},
      clearFileRegistry: function() {},
      addRule: function() {
        // passthrough
        Analyzer.addRule.apply(Analyzer, arguments);
      },
      manifest: function() {
        // passthrough
        Analyzer.manifest.apply(Analyzer, arguments);
      }
    };
  });
  Inject = new AsStatic();
})();
