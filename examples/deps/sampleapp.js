function run() {
  require("bar");
  var $ = require("jquery");
  require("jquery.ui.core");
  require("jquery.ui.widget");
  require("jquery.ui.button");

  $("a.button").button();
}

exports.run = run;