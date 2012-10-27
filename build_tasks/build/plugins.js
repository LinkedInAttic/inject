var Seq = require("seq");
var bu = require("../util");
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
        "plugins/css.js"
      ])
      .write(options.dest, "inject-plugins.js")
      .minify()
      .write(options.dest, "inject-plugins.min.js")
      .end(next.ok);
    });
  };
};