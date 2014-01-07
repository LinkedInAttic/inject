// program.js
require.ensure(['change_span'], function(require) {
  var fn = require('change_span').change;
  fn('<span id=\'demo-tada\'>This text string has been loaded dynamically using Inject.</span> '+
    'The adjacent code is all you need! Point to Inject, tell it where '+
    'to find additional JavaScript modules, and start your program.');
});