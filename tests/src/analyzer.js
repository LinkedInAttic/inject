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
module("src :: Analyzer", {
  setup: function() {
    sandbox = new Sandbox(true);
    loadDependencies(sandbox, [
      "/src/includes/constants.js",
      "/src/lib/class.js",
      "/src/analyzer.js"
    ]);
  },
  teardown: function() {
    sandbox = null;
  }
});

var requireSampleCode = ([
'/*',
' * require("ignoreA");',
'require("ignoreB");',
'*/',
'//require("ignoreC");',
'var a = require("expected");',
'var b=require("expectedB");',
"var c=require('expectedC');",
' require("ignoreD", "ignoreE");',
' require(ignoreF);',
'']).join("\n");

var sampleFunction = "function foo(one, two, three) {};";

test("Scaffolding", function() {
  var context = sandbox.global;
  ok(typeof(context.Analyzer) === "object", "object exists");
});

test("extraction", function() {
  var context = sandbox.global;;
  var result = context.Analyzer.extractRequires(requireSampleCode);
  var item;

  var okRegex = /expected/g;
  var badRegex = /ignore/g;

  var totalOk = requireSampleCode.match(okRegex).length;

  ok(result.length > 0, "found some require statements");
  equal(result.length, totalOk, "all expected require() statements found");

  // loop through everything in results, ensure we don't match a bad one
  for (var i = 0, len = result.length; i < len; i++) {
    item = result[i];
    if (badRegex.test(item) === true) {
      ok(false, "the following require() statement should have been skipped: "+item);
    }
    else {
      ok(true, "found expected regex: "+item);
    }
  }
});

test("function args", function() {
  var context = sandbox.global;
  var result = context.Analyzer.getFunctionArgs(sampleFunction);
  deepEqual(result, ["one", "two", "three"], "function contains all proper arguments");
});