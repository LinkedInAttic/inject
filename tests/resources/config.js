QUnit.config.testTimeout = 3000;

var loadDependencies = function(into, deps, then) {
  var doLoad = function() {
    var dep = deps.shift();
    if (dep) {
      into.load(dep, function() {
        doLoad();
      });
    }
    else {
      if (then) {
        then();
      }
      start();
    }
  };
  stop();
  doLoad();
};