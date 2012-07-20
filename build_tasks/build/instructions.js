var Seq = require("seq"),
    bu = require("../util"),
    packages;

packages = {
  "ie7compat": function(options, cb) {
    if (options.nolegacy) {
      return cb(null, "SKIPPED");
    }

    var src = options.src,
        dest = options.dest,
        tmp = options.tmp;

    Seq()
    .par(function() {
      bu.grab(src+"/compat/localstorage-shim.js", this);
    })
    .par(function() {
      bu.grab(src+"/compat/json.js", this);
    })
    .seq(function() {
      bu.concat(arguments, this);
    })
    .seq(function(file) {
      bu.uglify(file, this);
    })
    .seq(function(file) {
      var next = this;
      Seq()
      .seq(function() {
        bu.grab(src+"/compat/localstorage-assets.txt", this);
      })
      .seq(function(headers) {
        bu.concat([headers, file], this);
      })
      .seq(function(file) {
        next.ok(file);
      });
    })
    .seq(function(file) {
      bu.write(dest+"/inject-ie7.js", file, this);
    })
    .seq(function() {
      cb();
    });
  },
  "main": function(options, cb) {
    var src = options.src,
        dest = options.dest;

    Seq()
    .par(function() {
      bu.grab(src+"/includes/copyright.js", this);
    })
    .par(function() {
      var next = this;
      if (options.noxd) {
        this.ok("");
      }
      else {
        Seq()
        .par(function() {
          bu.grab(src+"/compat/easyxdm-closure.js", this);
        })
        .par(function() {
          bu.grab(src+"/lib/easyxdm.js", this);
        })
        .seq(function() {
          bu.concat(arguments, this);
        })
        .seq(function(file) {
          next.ok(file);
        })
      }
    })
    .par(function() {
      bu.grab(src+"/lib/lscache.js", this);
    })
    .par(function() {
      bu.compileCoffeeScript(src+"/inject.coffee", this);
    })
    .seq(function() {
      bu.concat(arguments, this);
    })
    .seq(function(file) {
      bu.anonymize(file, this);
    })
    .par(function(file) {
      // write unminified
      bu.write(dest+"/inject.js", file, this);
    })
    .par(function(file) {
      // minify, then write
      var next = this;
      Seq()
      .par(function() {
        bu.grab(src+"/includes/copyright-lic-min.js", this);
      })
      .par(function() {
        bu.uglify(file, this);
      })
      .seq(function() {
        bu.concat(arguments, this);
      })
      .seq(function(minifiedFile) {
        bu.write(dest+"/inject.min.js", minifiedFile, this);
      })
      .seq(function() {
        next.ok();
      });
    })
    .seq(function() {
      cb();
    });
  },
  "crossDomain": function(options, cb) {
    var src = options.src,
        dest = options.dest,
        tmp = options.tmp;

    if (options.noxd) {
      return cb(null, "SKIPPED");
    }

    Seq()
    .par(function() {
      bu.copy(src+"/xd/relay.html", dest+"/relay.html", this);
    })
    .par(function() {
      bu.copy(src+"/xd/relay.swf", dest+"/relay.swf", this);
    })
    .seq(function() {
      cb();
    });
  }
};

module.exports = packages;