// rules engine JS
var RulesEngine;
(function() {
  var AsStatic = Class.extend(function() {
    return {
      init: function() {},
      getPointCuts: function(moduleId, asString) {},
      addRule: function(regexMatch, weight, ruleSet) {},
      manifest: function(manifestObj) {},
      applyRules: function(moduleId) {},
      toUrl: function(moduleId) {}
    };
  });
  RulesEngine = new AsStatic();
})();
