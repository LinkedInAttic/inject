amdJS.group('plugin_double');

var count = 0;
var timeout = 10000;
var timer = window.setTimeout(function() {
  amdJS.assert(false, 'test timed out');
  amdJS.done();
}, timeout);

var done = function() {
  count++;
  if (count === 2) {
    window.clearTimeout(timer);
    amdJS.assert(true, 'double plugin call');
    amdJS.done();
  }
};

go(     ['double!foo'],
function (foo) {
  if (foo === 'x') {
    done();
  }
});

go(     ['double!foo'],
function (foo) {
  if (foo === 'x') {
    done();
  }
});
