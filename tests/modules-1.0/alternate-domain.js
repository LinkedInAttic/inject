(function() {

// the number of expectations for either same or different domains
// helps ensure we are consistent in our tests
var EXPECTATIONS = 4;

module("Multiple domain tests (based on Modules 1.0)", {
  setup: function() {
    if (localStorage) {
      localStorage.clear();
    }
    Inject.reset();
  },
  teardown: function() {
    if (localStorage) {
      localStorage.clear();
    }
  }
});

asyncTest("same domain (baseline)", EXPECTATIONS, function() {
  require.setModuleRoot("http://localhost:4000/tests/modules-1.0/includes/spec");
  require.run("program");
});

asyncTest("alternate domain", EXPECTATIONS, function() {
  require.setModuleRoot("http://localhost:4001/tests/modules-1.0/includes/spec");
  require.setCrossDomain("http://localhost:4000/relay.html",
                         "http://localhost:4001/relay.html");
  require.run("program");
});

})();