QUnit.config.testTimeout = 3000;

var clearAllCaches = function(into) {
  if (into.localStorage && typeof(into.localStorage.clear) === "function") {
    into.localStorage.clear();
  }

  if (into !== window) {
    clearAllCaches(window);
  }
};

