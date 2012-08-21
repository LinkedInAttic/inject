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
var bu = require("./util");

// optimist
var optimist = require("optimist")
    .usage("Build the documentation for inject.\nUsage: $0 docs")
    .boolean("help")
    .describe("help", "show this message")
    .describe("output", "select an output directory, defaults to ./artifacts");
var argv = optimist.argv;

// okay, lets do this
var src = path.resolve(path.normalize("./src"));
var docs = (argv.output) ? path.resolve(argv.output) : path.resolve(path.normalize("./artifacts"));

docs = path.resolve(docs + "/inject-docs");

// options collection
var options = {
  src: src,
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
  bu.mkdirpSync(docs);

  Seq()
  .seq(function() {
    require("util").log("Generating documentation");
    // this == next build step
    // master file
    var docs = options.docs;
    var src = options.src;
    var next = this;
    bu.JSDoc(src, docs, next);
  })
  .seq(function() {
    require("util").log("Doc Generation Successful");
  });
};