var Seq = require("seq");
var bu = require("../util");
exports.task = function(options) {
  return function () {
    require("util").log("Building inject");
    // this == next build step
    // master file
    var src = options.src;
    var dest = options.dest;
    var tmp = options.tmp;
    var next = this;

    Seq()
    .seq(function() {
      bu.copy("./LICENSE", dest+"/LICENSE", this);
    })
    .seq(function() {
      bu.copy("./README.markdown", dest+"/README.markdown", this);
    })
    .seq(function() {
      bu.buildChain
      .concat(options.src, [
        "includes/constants.js",
        "includes/globals.js",
        "includes/commonjs.js",
        "lib/class.js",
        (options.noxd) ? null : "lib/easyxdm-closure.js",
        (options.noxd) ? null : "lib/easyxdm.js",
        "lib/lscache.js",
        "includes/environment.js",
        "analyzer.js",
        "communicator.js",
        "executor.js",
        "injectcore.js",
        "requirecontext.js",
        "rulesengine.js",
        "treedownloader.js",
        "treenode.js",
        "includes/context.js"
      ])
      .tagVersion("context.Inject.version = \"__INJECT_VERSION__\";")
      .anonymize("context, undefined", "this")
      .write(options.dest, "inject.js")
      .minify()
      .write(options.dest, "inject.min.js")
      .end(next.ok);
    });
  };
};