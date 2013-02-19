// amdjs_bridge

// confuguring the AMD JS bridge's required functions for
// QUnit compatibility
var amdJS = {};
(function() {
  amdJS.group = function(name) {
    module(name);
  };
  amdJS.assert = function(guard, message) {
    ok(guard, message);
  };
})();


// AMD JS CONFIGURATION SECTION
Inject.reset();

// setting Inject's module root based on the current HREF
(function() {
  var href = location.href.split("?")[0];
  var moduleRoot;

  moduleRoot = href.substr(0, href.lastIndexOf('/') + 1);
  Inject.setModuleRoot(moduleRoot);
})();

var config = function(pathObj) {
  for(var key in pathObj.paths) {
    Inject.addRule(key, {
      path: pathObj.paths[key]
    });
  }
};

var go = function() {
  Inject.require.apply(this, arguments);
};

var implemented = {
  basic: true,
  anon: true,
  funcString: true,
  namedWrapped: true,
  require: true,
  plugins: true
  // pluginDynamic: true
};

require = undefined;
