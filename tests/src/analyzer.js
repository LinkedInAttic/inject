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

/**
 * @venus-library qunit
 * @venus-include ../resources/config.js
 * @venus-include ../resources/sinon.js
 * @venus-include ../../src/includes/constants.js
 * @venus-include ../../src/lib/class.js
 * @venus-include ../../src/lib/link.js
 * @venus-include ../../src/analyzer.js
 */

module('Analyzer');

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

var requireSampleCode_177 = ([
'define("player", ["one", "two", "three", "exports"], function(one, two, three, exports) {',
'    var colors = ["#ff0000", "#0000ff"];',
'    exports.colors = colors;',
'});',
'']).join("\n");

var sampleFunction = "function foo(one, two, three) {};";

test("Scaffolding", function() {
  ok(typeof(Analyzer) === "object", "object exists");
});

test("extraction", function() {
  var result = Analyzer.extractRequires(requireSampleCode);
  var item;

  var okRegex = /expected/g;
  var badRegex = /ignore/g;

  var totalOk = requireSampleCode.match(okRegex).length;

  ok(result.length > 0, "found some require statements");
  equal(result.length, totalOk, "all expected require() statements found: "+result.join(" "));

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

test("#177 define syntax messes up with arrays", function() {
  var result = Analyzer.extractRequires(requireSampleCode_177);
  equal(result.length, 3, "only three modules identified");
});