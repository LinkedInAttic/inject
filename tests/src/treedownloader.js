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
 * @venus-include ../../src/includes/globals.js
 * @venus-include ../../src/lib/class.js
 * @venus-include ../../src/lib/link.js
 * @venus-include ../../src/lib/flow.js
 * @venus-include ../../src/lib/lscache.js
 * @venus-include ../../src/communicator.js
 * @venus-include ../../src/analyzer.js
 * @venus-include ../../src/rulesengine.js
 * @venus-include ../../src/treenode.js
 * @venus-include ../../src/treedownloader.js
 */

var Executor;

module("TreeDownloader", {
  setup: function() {
    /* Sample Tree To Build
            root
            /  \
           A    B
          / \   |
         B   C  D
         |      |
         D      A
         |     / \
        (A)  (B)  C

      ["(a)", "d", "b", "c", "a", "(b)", "c", "a", "d", "b", "ROOT"]
    */

    Executor = {
      flagModuleAsCircular: function() {},
      isModuleDefined: function() {}
    };

    var rootJS = "root.js contents";
    var rootUrl = "http://example.com/root.js";
    var rootRequires = ["a", "b"];

    var aJS = "a.js contents";
    var aUrl = "http://example.com/a.js";
    var aRequires = ["b", "c"];

    var bJS = "b.js contents";
    var bUrl = "http://example.com/b.js";
    var bRequires = ["d"];

    var cJS = "c.js contents";
    var cUrl = "http://example.com/c.js";
    var cRequires = [];

    var dJS = "d.js contents";
    var dUrl = "http://example.com/d.js";
    var dRequires = ["a"];

    // stub our rules engine
    sinon.stub(RulesEngine, "resolveIdentifier")
      .withArgs("root").returns("root")
      .withArgs("a").returns("a")
      .withArgs("b").returns("b")
      .withArgs("c").returns("c")
      .withArgs("d").returns("d")
    sinon.stub(RulesEngine, "resolveUrl")
      .withArgs("root").returns(rootUrl)
      .withArgs("a").returns(aUrl)
      .withArgs("b").returns(bUrl)
      .withArgs("c").returns(cUrl)
      .withArgs("d").returns(dUrl)

    // stub our communicator calls
    sinon.stub(Communicator, "get")
      .withArgs("root", rootUrl).callsArgWith(2, rootJS)
      .withArgs("a", aUrl).callsArgWith(2, aJS)
      .withArgs("b", bUrl).callsArgWith(2, bJS)
      .withArgs("c", cUrl).callsArgWith(2, cJS)
      .withArgs("d", dUrl).callsArgWith(2, dJS);

    // stub our analyzer calls
    sinon.stub(Analyzer, "extractRequires")
      .withArgs(rootJS).returns(rootRequires)
      .withArgs(aJS).returns(aRequires)
      .withArgs(bJS).returns(bRequires)
      .withArgs(cJS).returns(cRequires)
      .withArgs(dJS).returns(dRequires);
  },
  teardown: function() {
    RulesEngine.resolveIdentifier.restore();
    RulesEngine.resolveUrl.restore();
    Communicator.get.restore();
    Analyzer.extractRequires.restore();
  }
});

test("Scaffolding", function() {
  ok(typeof(TreeDownloader) === "function", "object exists");
});

asyncTest("DownloadTree", 2, function() {
  var expected = ["(a)", "d", "b", "c", "a", "(b)", "c", "a", "d", "b", "root"];
  var root = TreeDownloader.createNode("root");

  var td = new TreeDownloader(root);
  td.get(function(tree, files) {
    // test circular
    var out = [];
    tree.postOrder(function(item) {
      if (!item.getValue()) {
        out.push(null);
        return;
      }
      
      if (item.isCircular()) {
        out.push("("+item.getValue().name+")");
      }
      else {
        out.push(item.getValue().name);
      }
    });
    deepEqual(out, expected, "circular dependencies located");

    // test files
    var count = 0;
    for (var name in files) {
      count++;
    }
    equal(count, 5, "response contains 5 files from the tree");

    start();
  })
});