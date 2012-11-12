var Seq = require("seq");
var bu = require("../util");
var path = require("path");

exports.task = function(options) {
  return function () {
    require("util").log("Building plugins");
    // this == next build step
    // master file
    var src = options.src;
    var dest = options.dest;
    var tmp = options.tmp;
    var next = this;

    Seq()
    .seq(function() {
      bu.buildChain
      .concat(options.src, [
        "plugins/css.js",
        "plugins/text.js"
      ])
      .header(path.join(options.src, "includes/copyright-lic-min.js"))
      .write(options.dest, "inject-plugins.js")
      .minify()
      .header(path.join(options.src, "includes/copyright-lic-min.js"))
      .write(options.dest, "inject-plugins.min.js")
      .end(next.ok);
    });
  };
};