// query-string
asyncTest("Plugin infrastructure is working correctly", 1, function() {
  require.ensure(['text-plugin'], function (require) {
    var txt = require('text-plugin').run();
    equal(txt, 'qwertyuiop', 'Inject plugin architecture works correctly');
    start();
  });
});