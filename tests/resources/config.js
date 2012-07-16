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

var exposeQUnit = function(into) {
  var calls = ["asyncTest", "deepEqual", "equal", "expect", "module", "ok", "start", "stop", "strictEqual", "test", "throws"];
  var fn;
  for (var i = 0, len = calls.length; i < len; i++) {
    fn = calls[i];
    into.global[fn] = window[fn];
  }
};