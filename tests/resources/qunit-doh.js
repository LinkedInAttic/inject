// doh-qunit bridge

(function(window, undefined) {

var dohAssert = {
  is: function(expect, actual) {
    return equal(expect, actual);
  }
};

var dohAsserCounter = function() {
  cnt = 0;
  this.is = function() {
    cnt++;
  };
  this.__count = function() {
    return cnt;
  }
};

window.doh = {
  register: function(name, tests) {
    // stop qunit
    // register module
    // register tests
    stop();
    var counter;
    for (var i = 0, len = tests.length; i < len; i++) {
      counter = new dohAsserCounter();
      tests[i](counter);
      asyncTest(name, counter.__count(), function() {
        tests[i](dohAssert);
        start();
      });
    }
  },
  run: function() {}
};

})(this);