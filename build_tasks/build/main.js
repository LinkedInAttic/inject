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
      (options.noxd) ? null : "compat/easyxdm-closure.js",
      (options.noxd) ? null : "lib/easyxdm.js",
      "lib/lscache.js",
      "includes/environment.js",
      "analyzer.js",
      "communicator.js",
      "database.js",
      "db/generic.js",
      "db/module.js",
      "db/queue.js",
      "db/transaction.js",
      "downloadmanager.js",
      "executor.js",
      "rulesengine.js",
      "treenode.js",
      "inject.js",
      "includes/context.js"
    ])
    .anonymize("context, undefined", "this")
    .write(options.dest, "inject.js")
    .minify()
    .write(options.dest, "inject.min.js")
    .end(this.ok);
  };
};