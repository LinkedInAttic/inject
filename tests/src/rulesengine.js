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
module("RulesEngine", {
  setup: function() {
    sandbox = new Sandbox(false);
    loadDependencies(sandbox, [
      "/src/includes/constants.js",
      "/src/includes/globals.js",
      "/src/lib/class.js",
      "/src/database.js",
      "/src/db/generic.js",
      "/src/db/queue.js",
      "/src/rulesengine.js"
    ]);
  },
  teardown: function() {
    sandbox = null;
  }
});

test("Scaffolding", function() {
  var context = sandbox.global;
  ok(typeof(context.RulesEngine) === "object", "object exists");
});

test("Basic Rules", function() {
  var context = sandbox.global;
  var RulesEngine = context.RulesEngine;

  RulesEngine.addRule("stringTestReplace", "stringTestReplaceResult");
  RulesEngine.addRule(/regexTestReplace/, "regexTestReplaceResult");
  RulesEngine.addRule(/regexObjectReplace/, {
    path: "regexObjectReplaceResult"
  });
  RulesEngine.addRule(/regexObjectFnReplace/, {
    path: function(path) {
      return path + "Result";
    }
  });

  equal(RulesEngine.resolve("stringTestReplace"), "stringTestReplaceResult", "basic rule resolution");
  equal(RulesEngine.resolve("regexTestReplace"), "regexTestReplaceResult", "regex rule resolution");
  equal(RulesEngine.resolve("regexObjectReplace"), "regexObjectReplaceResult", "regex rule with path in object");
  equal(RulesEngine.resolve("regexObjectFnReplace"), "regexObjectFnReplaceResult", "regex rule with path as function");
});

test("Manifest", function() {
  var context = sandbox.global;
  var RulesEngine = context.RulesEngine;
  var calls = 0;
  var expectedCalls = 1;

  // stub addRule... make sure it's called
  var addRule = RulesEngine.addRule;
  RulesEngine.addRule = function() {
    calls++;
    equal(arguments[0], "test", "arguments passed through");
    addRule.apply(RulesEngine, arguments);
  };

  RulesEngine.manifest({
    "test": "testOne"
  });

  equal(calls, expectedCalls, "addRule was called internally");
});

test("toUrl", function() {
  var context = sandbox.global;
  var RulesEngine = context.RulesEngine;
  var root = "http://resolved.com/src/to/modules";

  context.userConfig.moduleRoot = root;

  RulesEngine.addRule("absolute/path", "http://absolutepath.com/absolute/path.js");

  equal(RulesEngine.toUrl("sample"), root+"/sample.js", "basic URL resolution");
  equal(RulesEngine.toUrl("absolute/path"), "http://absolutepath.com/absolute/path.js", "absolute path resolution");
  equal(RulesEngine.toUrl("../a/b", root+"/one/two"), root+"/one/a/b.js", "relative path resolution");
});

test("pointcuts", function() {
  var context = sandbox.global;
  var RulesEngine = context.RulesEngine;

  RulesEngine.addRule("test", {
    before: function() {
      this_is_before;
    },
    after: function() {
      this_is_after;
    }
  });

  ok(/this_is_before/.test(RulesEngine.getPointcuts("test").before), "before pointcut loaded");
  ok(/this_is_after/.test(RulesEngine.getPointcuts("test").after), "after pointcut loaded");
});
