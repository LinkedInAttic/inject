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
    },
    log: function() {
      var args = [].slice.call(arguments);
      console.log("TreeDownloader", "("+this.root.getValue().name+")", "\n"+args.join(" "));
    },
    reduceCallsRemaining: function(callback, args) {
      this.callsRemaining--;
      this.log("reduce. outstanding", this.callsRemaining);
      // TODO: there is a -1 logic item here to fix
      if (this.callsRemaining <= 0) {
        callback.apply(null, args);
      }
    },
    increaseCallsRemaining: function(by) {
      this.callsRemaining += by || 1;
      this.log("increase. outstanding", this.callsRemaining);
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
      this.log("started download");
      this.downloadTree(this.root, bind(function(root) {
        callback(this.root, this.getFiles());
      }, this));
    },
    downloadTree: function(node, callback) {
      // Normalize Module Path. Download. Analyze.
      var parentPath = (node.getParent() && node.getParent().getValue())
                        ? node.getParent().getValue().path
                        : userConfig.moduleRoot;
      node.getValue().path = RulesEngine.resolve(node.getValue().name, parentPath).path;

      // top level starts at 1
      if (!node.getParent()) {
        this.increaseCallsRemaining();
      }

      // download the file
      this.log("requesting file", node.getValue().path);
      Communicator.get(node.getValue().path, bind(function(contents) {
        this.log("download complete", node.getValue().path);
        var parent = node;
        var found = {};
        var value;

        // seed found with the first item
        found[node.getValue().path] = true;
        parent = parent.getParent();
        // test if you are a circular reference. check every parent back to root
        while(parent) {
          if (!parent.getValue()) {
            // reached root
            break;
          }

          value = parent.getValue().path;
          if (found[value]) {
            this.log("circular reference found", node.getValue().path);
            node.flagCircular();
          }
          found[value] = true;
          parent = parent.getParent();
        }

        // if it is not circular, and we have contents
        if (!node.isCircular() && contents) {
          // store file contents for later
          this.files[node.getValue().path] = contents;

          var requires = Analyzer.extractRequires(contents);
          var childNode;
          var path;

          this.log("dependencies for", node.getValue().path, requires.join(", "));

          // for each requires, create a child and spawn
          if (requires.length) {
            this.increaseCallsRemaining(requires.length);
          }
          for (var i = 0, len = requires.length; i < len; i++) {
            path = RulesEngine.resolve(requires[i], node.getValue().path).path;
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
        this.reduceCallsRemaining(callback, node);
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