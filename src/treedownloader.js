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
      var args = [].slice.call(arguments, 0);
      var name = (this.root.getValue()) ? this.root.getValue().name : null;
      debugLog("TreeDownloader ("+name+")", args.join(" "));
    },
    reduceCallsRemaining: function(callback, args) {
      this.callsRemaining--;
      this.log("reduce. outstanding", this.callsRemaining);
      // TODO: there is a -1 logic item here to fix
      if (this.callsRemaining <= 0) {
        callback.call(null, args);
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
      this.downloadTree(this.root, proxy(function(root) {
        callback(this.root, this.getFiles());
      }, this));
    },
    downloadTree: function(node, callback) {
      // Normalize Module Path. Download. Analyze.
      var parentPath = (node.getParent() && node.getParent().getValue())
                        ? node.getParent().getValue().path
                        : userConfig.moduleRoot;
      var parentName =  (node.getParent() && node.getParent().getValue())
                        ? node.getParent().getValue().name
                        : "";

      // get the path and REAL identifier for this module (resolve relative references)
      var identifier = RulesEngine.resolveIdentifier(node.getValue().name, parentName);
      node.getValue().path = RulesEngine.resolveUrl(identifier);
      node.getValue().resolvedId = identifier;

      // top level starts at 1
      if (!node.getParent()) {
        this.increaseCallsRemaining();
      }

      // do not bother to download AMD define()-ed files
      if (Executor.isModuleDefined(node.getValue().name)) {
        this.log("AMD defined module, no download required", node.getValue().name);
        this.reduceCallsRemaining(callback, node);
        return;
      }

      this.log("requesting file", node.getValue().path);
      Communicator.get(node.getValue().name, node.getValue().path, proxy(function(contents) {
        this.log("download complete", node.getValue().path);
        var parent = node;
        var found = {};
        var value;

        // seed found with the first item
        found[node.getValue().name] = true;
        parent = parent.getParent();
        // test if you are a circular reference. check every parent back to root
        while(parent) {
          if (!parent.getValue()) {
            // reached root
            break;
          }

          value = parent.getValue().name;
          if (found[value]) {
            this.log("circular reference found", node.getValue().name);
            // flag the node as circular (commonJS) and the module itself (AMD)
            node.flagCircular();
            Executor.flagModuleAsCircular(node.getValue().name);
          }
          found[value] = true;
          parent = parent.getParent();
        }

        // if it is not circular, and we have contents
        if (!node.isCircular() && contents) {
          // store file contents for later
          this.files[node.getValue().name] = contents;

          var tempRequires = Analyzer.extractRequires(contents);
          var requires = [];
          var childNode;
          var name;
          var path;

          // remove already-defined AMD modules before we go further
          for (var i = 0, len = tempRequires.length; i < len; i++) {
            name = RulesEngine.resolveIdentifier(tempRequires[i], node.getValue().name);
            if (!Executor.isModuleDefined(name) && !Executor.isModuleDefined(tempRequires[i])) {
              requires.push(tempRequires[i]);
            }
          }

          this.log("dependencies ("+requires.length+"):" + requires.join(", "));

          // for each requires, create a child and spawn
          if (requires.length) {
            this.increaseCallsRemaining(requires.length);
          }
          for (var i = 0, len = requires.length; i < len; i++) {
            name = requires[i];
            path = RulesEngine.resolveUrl(RulesEngine.resolveIdentifier(name, node.getValue().name));
            childNode = TreeDownloader.createNode(name, path);
            node.addChild(childNode);
            this.downloadTree(childNode, proxy(function() {
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