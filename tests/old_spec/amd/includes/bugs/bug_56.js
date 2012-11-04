define(['exports', 'bug_56a', 'bug_56b'], function(exports, math, delay) {
  exports.inc = function(val) {
    return math.add(val, 1);
  };
  exports.isDelayed = true;
  exports.delayedBy = delay.delay.duration;
  
  ok(true, "Module increment.delay loaded");
});