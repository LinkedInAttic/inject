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
module("DownloadManager", {
  setup: function() {
    sandbox = new Sandbox(true);
    loadDependencies(sandbox, [
      "/src/includes/constants.js",
      "/src/includes/globals.js",
      "/src/lib/class.js",
      "/src/treenode.js",
      "/src/downloadmanager.js"
    ], function() {
      sandbox.global.TreeDownloader = function() {};
      sandbox.global.TreeDownloader.prototype.get = function() {};
    });
  },
  teardown: function() {
    sandbox = null;
  }
});

test("Scaffolding", function() {
  var context = sandbox.global;
  ok(typeof(context.DownloadManager) === "object", "object exists");
});

asyncTest("Calls TreeDownloader", 1, function() {
  var localCB = function() {
    ok(true, "local callback invoked via TreeDownloader");
    start();
  };
  
  sinon.stub(sandbox.global.TreeDownloader.prototype, "get")
    .callsArgWith(0, localCB);

  sandbox.global.DownloadManager.download(["a", "b"], localCB);
});
