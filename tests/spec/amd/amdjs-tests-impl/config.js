/* 
Note: When running the tests for the inject loader make sure localStorage has been
cleared for the first run to ensure the latest version of the tests are executed.
Either clear the browser cookies or programatically run localStorage.clear();
*/
function config(pathObj) {
  for(var key in pathObj.paths) {
    Inject.addRule(key, {path:pathObj.paths[key]});
  }
}

function go() {
  Inject.require.apply(window, arguments);
}

window.implemented = {
  basic: true,
  anon: true,
  funcString: true,
  namedWrapped: true,
  require: true,
  plugins: true
  // pluginDynamic: true
};

window.require = undefined;
