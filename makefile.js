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
var tasks = ["build", "server"],
    optimist = require("optimist")
    .usage("Inject command line tool.\nUsage: $0 [task]\ntasks are: "+tasks.join(", "))
    .boolean("help")
    .describe("help", "show this message, or show details for a task"),
    argv = optimist.argv,
    argv_ = argv._,
    task = argv_[0];

switch (task) {
  case "build":
    require("./build_tasks/build.js").task();
    break;
  case "server":
  	require("./build_tasks/testserver.js").task();
  	break;
  default:
    optimist.showHelp();
    break;
}

