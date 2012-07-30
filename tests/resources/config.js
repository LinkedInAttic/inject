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
        then(into);
      }
      start();
    }
  };
  stop();
  doLoad();
};

var clearAllCaches = function(into) {
  if (into.localStorage && typeof(into.localStorage.clear) === "function") {
    into.localStorage.clear();
  }

  if (into !== window) {
    clearAllCaches(window);
  }
};

var exposeQUnit = function(into) {
  var calls = ["asyncTest", "deepEqual", "equal", "expect", "module", "ok", "raises", "start", "stop", "strictEqual", "test", "throws"];
  var fn;
  for (var i = 0, len = calls.length; i < len; i++) {
    fn = calls[i];
    into.global[fn] = window[fn];
  }
};