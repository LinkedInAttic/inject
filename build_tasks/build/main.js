var Seq = require("seq");
var bu = require("../util");
exports.task = function(options) {
  return function () {
    // this == next build step
    // master file
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
      "inject.js",
      "requirecontext.js",
      "rulesengine.js",
      "treedownloader.js",
      "treenode.js",
      "includes/context.js"
    ])
    .anonymize("context, undefined", "this")
    .write(options.dest, "inject.js")
    .minify()
    .write(options.dest, "inject.min.js")
    .end(this.ok);
  };
};