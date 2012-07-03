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
module("Inject", {
  setup: function() {
    sandbox = new Sandbox(true);
    loadDependencies(sandbox, [
      "/src/includes/constants.js",
      "/src/includes/globals.js",
      "/src/lib/class.js",
      "/src/inject.js"
    ], function() {
    });
  },
  teardown: function() {
    sandbox = null;
  }
});

test("Scaffolding", function() {
  var context = sandbox.global;
  ok(typeof(context.Inject) === "object", "object exists");
});

test("Passthrough and config", function() {
  sandbox.global.Analyzer = {
    addRule: sinon.stub(),
    manifest: sinon.stub()
  };
  sandbox.global.Executor = {
    runModule: sinon.stub()
  };
  sandbox.global.DownloadManager = {
    download: sinon.stub()
  };

  var context = sandbox.global;

  context.Inject.setModuleRoot("http://testok.com");
  context.Inject.setCrossDomain({
    relayFile: "http://testok-relay.com",
    relaySwf: "http://testok-swf.com"
  });
  context.Inject.setExpires(987654);

  // tbd
  // context.Inject.clearCache();
  // context.Inject.reset();
  // context.Inject.clearFileRegistry();

  // test userConfig
  equal(context.userConfig.moduleRoot, "http://testok.com", "moduleRoot");
  equal(context.userConfig.xd.relayFile, "http://testok-relay.com", "relayFile");
  equal(context.userConfig.xd.relaySwf, "http://testok-swf.com", "relaySwf");
  equal(context.userConfig.fileExpires, 987654, "fileExpires");

  // test passthroughts
  context.Inject.addRule("foo", "bar");
  ok(sandbox.global.Analyzer.addRule.called, "Passed addRule through");
  
  context.Inject.manifest({});
  ok(sandbox.global.Analyzer.manifest.called, "Passed manifest through");


});
