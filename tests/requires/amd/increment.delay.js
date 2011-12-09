define('increment.delay', ['exports', 'math', 'delay'], function(exports, math, delay) {
  exports.inc = function(val) {
    return math.add(val, 1);
  };
  exports.isDelayed = true;
  exports.delayedBy = delay.delay.duration;
  
  ok(true, "Module increment.delay loaded");
});