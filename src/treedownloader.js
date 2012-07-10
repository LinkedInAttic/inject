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

// depends on
// ModuleDB
//  GenericDB
// ModuleDBRecord
//  GenericDBRecord
// TreeNode
// Communicator
// Analyzer

var TreeDownloader = Class.extend(function() {
  return {
    init: function(root) {
      this.callsRemaining = 0;
      this.root = root;
      this.files = {};
    reduceCallsRemaining: function(callback, args) {
      this.callsRemaining--;
      if (!this.callsRemaining) {
        callback.apply(null, args);
      }
    },
    increaseCallsRemaining: function(by) {
      this.callsRemaining += by || 1;
    },
    getFiles: function() {
      return this.files;
    },
    get: function(callback) {
      /*
          root
          /  \
         A    B
        / \   |
       B   C  D
       |      |
       D      A
       |     / \
      (A)  (B)  C

       root: no-download. Add A, Add B. Spawn A, Spawn B // count = 0 + 2 = 2 (add A, add B)
       A: download. Add B, Add C. Spawn C (B logged) // count = 2 - 1 + 1 = 2 (remove A, add C)
       B: download. Add D. Spawn D // count = 2 - 1 + 1 = 2 (remove B, add D)
       C: download // count = 2 - 1 = 1 (remove C)
       D: download // count = 1 - 1 = 0 (remove D)
      */
      this.downloadTree(this.root, function(root) {
        callback(null, root);
      });
    },
    downloadTree: function(node, callback) {
      // Normalize Module Path. Download. Analyze.
      var parentPath = (node.getParent()) ? node.getParent().getValue().path : userConfig.moduleRoot;
      node.getValue().path = RulesEngine.resolve(node.getValue().path, parentPath);

      // download the file
      Communicator.get(node.getValue().path, bind(function(contents) {
        var parent = node;
        var found = {};
        var value;

        // seed found with the first item
        found[node.getValue().path] = true;
        // test if you are a circular reference. check every parent back to root
        while(parent = parent.getParent()) {
          value = parent.getValue().path;
          if (found[value]) {
            node.flagCircular();
          }
          found[value] = true;
        }

        // if it is not circular, and we have contents
        if (!node.isCircular() && contents) {
          var requires = Analyzer.extractRequires(contents);
          var childNode;
          var path;
          // for each requires, create a child and spawn
          this.increaseCallsRemaining(requires.length);
          for (var i = 0, len = requires.length; i < len; i++) {
            path = RulesEngine.resolve(requires[i], node.getValue().path);
            childNode = TreeDownloader.createNode(requires[i], path);
            node.addChild(childNode);
            this.downloadTree(childNode, bind(function() {
              this.reduceCallsRemaining(callback, node);
            }, this));
          }
        }

        // if contents was a literal false, we had an error
        if (contents === false) {
          node.getValue().failed = true;
        }

        // this module is processed
        callback(node);
      }, this));
    }
  };
});
TreeDownloader.createNode = function(name, path, isCircular) {
  var tn = new TreeNode({
    name: name,
    path: path,
    failed: false
  });
  if (isCircular) {
    tn.flagCircular();
  }
  return tn;
}