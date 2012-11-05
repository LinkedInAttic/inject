/* 
Note: When running the tests for the inject loader make sure localStorage has been
cleared for the first run to ensure the latest version of the tests are executed.
Either clear the browser cookies or programatically run localStorage.clear();
*/
function setModuleRoot() {
  // for inject, we detect the "base" based on the test. This is
  // done because we also run the AMD tests from within the inject
  // test suite and want to write a single config.
  var url = location.href.split("?")[0],
      base = url.substr(0, url.lastIndexOf("/")+1);

  Inject.setModuleRoot(base);
}

Inject.reset();
var config = function(pathObj) {
  for(var key in pathObj.paths) {
    Inject.addRule(key, {path:pathObj.paths[key]});
  }
};
var go = function() {
  setModuleRoot();
  Inject.require.apply(this, arguments);
};
var implemented = {
  basic: true,
  anon: true,
  funcString: true,
  namedWrapped: true,
  require: true
  // plugins: true
  // pluginDynamic: true
};
require = undefined;

// nothing here should be so network laggy as to cause pain
// not applicable in the final config we submit to the AMD tests
window.setTimeout(function() {
  if (window.parent && window.parent.BeginListening) {
    window.parent.BeginListening();
  }
}, 1000);