/*
Inject
Copyright 2011 LinkedIn

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing,
software distributed under the License is distributed on an "AS
IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
express or implied.   See the License for the specific language
governing permissions and limitations under the License.
*/

// build task

var Seq = require("seq");
var path = require("path");
var fs = require("fs");
var build = require("./build/instructions");
var bu = require("./util");

// optimist
var optimist = require("optimist")
    .usage("Build inject with various options.\nUsage: $0 build")
    .boolean("help")
    .describe("help", "show this message")
    .default("noxd", false)
    .describe("noxd", "build for local only (disable cross domain support)")
    .default("nolegacy", false)
    .describe("nolegacy", "build for modern browsers only (disable ie7 support)")
    .describe("output", "select an output directory, defaults to ./artifacts");
var argv = optimist.argv;

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

// here is the export task for building
exports.task = function() {
  // answer calls for help
  if (argv.help) {
    optimist.showHelp();
    return;
  }

  // create output directory
  bu.mkdirpSync(dest);

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
}