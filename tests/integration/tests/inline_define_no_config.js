// verify inline define functionality
asyncTest("With no config, modules can be defined inline using AMD syntax - AMD", 1, function() {
  define('one', [], function() {
    return {
      two: 2
    };
  });
  require(['one'], function(one) {
    equal(one.two, 2, 'able to retrieve the value from an inline-defined AMD module');
    start();
  });
});
