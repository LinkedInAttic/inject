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

var sandbox;
module("ModuleDB and ModuleDBRecord", {
  setup: function() {
    sandbox = new Sandbox(true);
    loadDependencies(sandbox, [
      "/src/lib/class.js",
      "/src/database.js",
      "/src/db/generic.js",
      "/src/db/module.js"
    ]);
  },
  teardown: function() {
    sandbox = null;
  }
});

test("Scaffolding", function() {
  var context = sandbox.global;
  ok(typeof(context.DataBase.create("testDB", "module")) === "object", "object exists");
});

