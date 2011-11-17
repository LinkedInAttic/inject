// AMD, define a module with moduleId, deps, callback
define('qux.amd', ['exports', 'bar', 'foo'], function(exports, bar, foo) {
  var qux = function() {
    this.appender = ' from qux.amd!';
    this.sampleString = foo.sampleString + this.appender;
  };

  qux.prototype.Qux = function() {
    return 'I am Qux ' + this.appender;
  };

  exports.qux = qux;
  exports.bar = bar.Bar;
});
