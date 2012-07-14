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
module("Communicator", {
  setup: function() {
    // communicator does not use sandbox safeguards, beware!
    sandbox = new Sandbox(false);
    loadDependencies(sandbox, [
      "/src/includes/constants.js",
      "/src/includes/globals.js",
      "/src/lib/class.js",
      "/src/communicator.js"
    ], function() {
      // lscache stub
      sandbox.global.lscache = {
        setBucket: function() {},
        flush: function() {},
        set: sinon.stub(),
        get: sinon.stub()
      };
    });
  },
  teardown: function() {
    sandbox = null;
  }
});

test("Scaffolding", function() {
  var context = sandbox.global;
  ok(typeof(context.Communicator) === "object", "object exists");
});

asyncTest("Simple Get", 1, function() {
  var context = sandbox.global;
  var Communicator = context.Communicator;

  Communicator.get(location.href, function(results) {
    ok(results, "got results from communicator");
    start();
  });
});

asyncTest("Get uses lscache", 2, function() {
  var context = sandbox.global;
  var Communicator = context.Communicator;

  Communicator.get(location.href, function(results) {
    ok(sandbox.global.lscache.get.called, "lscache get called");
    ok(sandbox.global.lscache.set.called, "lscache set called");
    start();
  });
});

asyncTest("in lscache doesn't redownload", 2, function() {
  var context = sandbox.global;
  var Communicator = context.Communicator;

  context.lscache.get.withArgs(location.href).returns("content");

  Communicator.get(location.href, function(results) {
    ok(sandbox.global.lscache.get.called, "lscache get called");
    ok(!sandbox.global.lscache.set.called, "lscache set not called");
    start();
  });

});