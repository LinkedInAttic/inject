var Seq = require("seq");
var path = require("path");
var fs = require("fs");
var build = require("./build/instructions");
var bu = require("./build/build_util");

// optimist
var optimist = require("optimist")
    .usage("Build inject with various options.\nUsage: $0")
    .alias("help", "h")
    .describe("help", "show this message")
    .default("noxd", false)
    .alias("noxd", "l")
    .describe("noxd", "build for local only (disable cross domain support)")
    .default("nolegacy", false)
    .alias("nolegacy", "m")
    .describe("nolegacy", "build for modern browsers only (disable ie7 support)")
    .alias("output", "o")
    .describe("output", "select an output directory, defaults to ./artifacts");
var argv = optimist.argv;

// answer calls for help
if (argv.help) {
  optimist.showHelp();
  return;
}

// okay, lets do this
var src = path.resolve(path.normalize("./src"));
var dest = path.resolve(path.normalize("./artifacts/dev"));
var tmp = path.resolve(path.normalize("./artifacts/tmp"));

// options collection
var options = {
  noxd: argv.noxd,
  nolegacy: argv.nolegacy,
  src: argv.output || src,
  dest: dest,
};

// create output directory
bu.mkdirpSync(dest);

function doPackage(buildName, description, cb) {
  function announce(statement) {
    console.log("  "+description+": "+statement);
  }
  announce("BEGIN");
  build[buildName](options, function(err, result) {
    if (err) {
      announce("ERROR");
      cb(err, result);
    }
    else {
      if (result === "SKIPPED") {
        announce("SKIPPED");
      }
      else {
        announce("OK");
      }
      cb(err, result);
    }
  });
}

Seq()
.par(function() {
  doPackage("ie7compat", "ie7 compat files", this.into("ie7compat"));
})
.par(function() {
  doPackage("main", "main inject file", this.into("main"));
})
.par(function() {
  doPackage("crossDomain", "cross domain compatibilty", this.into("crossDomain"));
})
.seq(function() {
  console.log("All files built successfully!");
})
.catch(function(err) {
  console.log("There were one or more errors:");
  console.dir(err);
});