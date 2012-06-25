// communicator JS
var Communicator;
(function() {
  var AsStatic = Class.extend(function() {
    return {
      init: function() {},
      get: function(url, callback) {}
    };
  });
  Communicator = new AsStatic();
})();