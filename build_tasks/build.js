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
var dest = path.resolve(path.normalize("./artifacts/inject-dev"));
var docs = path.resolve(path.normalize("./artifacts/inject-docs"));
var tmp = path.resolve(path.normalize("./artifacts/tmp"));

// options collection
var options = {
  noxd: argv.noxd,
  nolegacy: argv.nolegacy,
  src: argv.output || src,
  dest: dest,
  docs: docs
};

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
  .par(require("./build/main").task(options))
  .par(require("./build/docs").task(options))
  .par(require("./build/ie7").task(options))
  .par(require("./build/crossdomain").task(options))
  .seq(function() {
    require("util").log("Build Successful");
  });
};