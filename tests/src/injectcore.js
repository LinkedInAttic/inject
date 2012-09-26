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
module("src :: Inject", {
  setup: function() {
    sandbox = new Sandbox(true);
    loadDependencies(sandbox, [
      "/src/includes/constants.js",
      "/src/includes/globals.js",
      "/src/lib/class.js",
      "/src/injectcore.js"
    ], function() {
      sandbox.global.HAS_LOCAL_STORAGE = true;

      sandbox.global.Executor = {
        runModule: sinon.stub()
      };
      sandbox.global.DownloadManager = {
        download: sinon.stub()
      };

      // stub out lscache
      sandbox.global.lscacheWithNoKey = {
        set: sinon.spy(),
        flush: sinon.spy(),
        get: sinon.stub().withArgs("!appCacheKey").returns(null)
      };
      sandbox.global.lscacheWithTwoKey = {
        set: sinon.spy(),
        flush: sinon.spy(),
        get: sinon.stub().withArgs("!appCacheKey").returns("2")
      };
    });
  },
  teardown: function() {
    sandbox = null;
  }
});

test("Scaffolding", function() {
  var context = sandbox.global;
  ok(typeof(context.InjectCore) === "object", "object exists");
});

test("Passthrough and config", function() {
  var context = sandbox.global;

  context.InjectCore.setModuleRoot("http://testok.com");
  context.InjectCore.setCrossDomain({
    relayFile: "http://testok-relay.com",
    relaySwf: "http://testok-swf.com"
  });
  context.InjectCore.setExpires(987654);
  context.InjectCore.setUseSuffix(true);

  // test userConfig
  equal(context.userConfig.moduleRoot, "http://testok.com", "moduleRoot");
  equal(context.userConfig.xd.relayFile, "http://testok-relay.com", "relayFile");
  equal(context.userConfig.xd.relaySwf, "http://testok-swf.com", "relaySwf");
  equal(context.userConfig.fileExpires, 987654, "fileExpires");
  equal(context.userConfig.useSuffix, true, "useSuffix");
});

test("setCacheKey wipes cache", function() {
  sandbox.global.lscache = sandbox.global.lscacheWithNoKey;
  sandbox.global.InjectCore.setCacheKey("5");
  ok(sandbox.global.lscache.flush.called, "cache was flushed");

  sandbox.global.lscache = sandbox.global.lscacheWithTwoKey;
  sandbox.global.InjectCore.setCacheKey("2");
  ok(!sandbox.global.lscache.flush.called, "cache was not flushed");

  sandbox.global.InjectCore.setCacheKey("5");
  ok(sandbox.global.lscache.flush.called, "cache was flushed");
});
