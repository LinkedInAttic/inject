function run() {
  var $ = require("jquery");
  require("jquery.ui.core");
  require("jquery.ui.widget");
  require("jquery.ui.button");
  require("bar");

  $("a.button").button();
}

exports.run = run;