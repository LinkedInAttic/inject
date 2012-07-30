var Seq = require("seq");
var bu = require("../util");
exports.task = function(options) {
  return function () {
    // this == next build step
    // ie7 compat
    if (options.nolegacy) {
      this.ok();
      return;
    }

    var src = options.src;
    var dest = options.dest;
    var tmp = options.tmp;
    var ieMinFile = null;
    var next = this;

    Seq()
    .seq(function() {
      bu.buildChain
      .concat(options.src, [
        "compat/localstorage-shim.js",
        "compat/json.js"
      ])
      .minify()
      .end(this.ok);
    })
    .seq(function(file) {
      ieMinFile = file;
      this.ok();
    })
    .seq(function() {
      bu.grab(src+"/compat/localstorage-assets.txt", this);
    })
    .seq(function(headers) {
      bu.concat([headers, ieMinFile], this);
    })
    .seq(function(contents) {
      bu.write(dest+"/inject-ie7.js", contents, this);
    })
    .seq(function() {
      next.ok();
    });
  };
};