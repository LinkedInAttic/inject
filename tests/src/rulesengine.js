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
module("src :: RulesEngine", {
  setup: function() {
    sandbox = new Sandbox(false);
    loadDependencies(sandbox, [
      "/src/includes/constants.js",
      "/src/includes/globals.js",
      "/src/lib/class.js",
      "/src/rulesengine.js"
    ], function() {
      sandbox.global.userConfig = {
        moduleRoot: "http://example.com",
        useSuffix: true
      }
    });
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

  equal(RulesEngine.resolve("stringTestReplace").path, "http://example.com/stringTestReplaceResult.js", "basic rule resolution");
  equal(RulesEngine.resolve("regexTestReplace").path, "http://example.com/regexTestReplaceResult.js", "regex rule resolution");
  equal(RulesEngine.resolve("regexObjectReplace").path, "http://example.com/regexObjectReplaceResult.js", "regex rule with path in object");
  equal(RulesEngine.resolve("regexObjectFnReplace").path, "http://example.com/regexObjectFnReplaceResult.js", "regex rule with path as function");
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

  equal(RulesEngine.toUrl("sample"), root+"/sample.js", "basic URL resolution");
  equal(RulesEngine.toUrl("http://absolutepath.com/absolute/path.js"), "http://absolutepath.com/absolute/path.js", "absolute path resolution");
  equal(RulesEngine.toUrl("../a/b", root+"/one/two"), root+"/one/a/b.js", "relative path resolution");
});

test("rules to toUrl", function() {
  var context = sandbox.global;
  var RulesEngine = context.RulesEngine;
  var root = "http://resolved.com/src/to/modules";
  var path;

  context.userConfig.moduleRoot = root;

  RulesEngine.addRule("absolute/path", "http://absolutepath.com/absolute/path.js");

  path = RulesEngine.resolve("absolute/path").path;
  equal(RulesEngine.toUrl(path), "http://absolutepath.com/absolute/path.js", "absolute path resolution");
});

test("Resolution of Pointcuts", function() {
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

  var testPath = RulesEngine.resolve("test").path;

  ok(/this_is_before/.test(RulesEngine.getPointcuts(testPath).before), "before pointcut loaded");
  ok(/this_is_after/.test(RulesEngine.getPointcuts(testPath).after), "after pointcut loaded");
});
