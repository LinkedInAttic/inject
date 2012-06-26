var Seq = require("seq");
var bu = require("../util");
exports.task = function(options) {
  return function () {
    // this == next build step
    var src = options.src;
    var dest = options.dest;
    var tmp = options.tmp;
    var next = this;

    if (options.noxd) {
      this.ok();
      return;
    }

    Seq()
    .par(function() {
      bu.copy(src+"/xd/relay.html", dest+"/relay.html", this);
    })
    .par(function() {
      bu.copy(src+"/xd/relay.swf", dest+"/relay.swf", this);
    })
    .seq(function() {
      next.ok();
    });
  };
};