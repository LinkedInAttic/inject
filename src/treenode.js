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

// TreeNode JS
var TreeNode = Class.extend(function() {
  return {
    init: function(id) {
      this.id = null;
      this.path = null;
      this.pointcuts = null;
      this.file = null;

      this.children = [];
      this.parent = null;
      this.left = null;
      this.right = null;

      if (id) {
        this.setId(id);
      }
    },
    setId: function(value) {
      return this.id = value;
    },
    getId: function() {
      return this.id;
    },
    getPath: function() {
      if (this.path) {
        return this.path;
      }
      var parentPath = (this.getParent()) ? this.getParent().getPath() : userConfig.moduleRoot;
      var results = RulesEngine.resolve(value, parentPath);
      this.path = results.path;
      return this.path;
    },
    getPointcuts: function() {
      if (this.pointcuts) {
        return this.pointcuts;
      }
      var parentPath = (this.getParent()) ? this.getParent().getPath() : userConfig.moduleRoot;
      var results = RulesEngine.resolve(value, parentPath);
      this.pointcuts = results.pointcuts;
      return this.pointcuts;
    },
    setFile: function(value) {
      return this.file = value;
    },
    getFile: function() {
      return this.file;
    },
    addChild: function(node) {
      var rightChild;
      if (this.children.length > 0) {
        rightChild = this.children[this.children.length - 1];
        node.setLeft(rightChild);
        rightChild.setRight(node);
      }
      this.children.push(node);
      return node.setParent(this);
    },
    getChildren: function() {
      return this.children;
    },
    setLeft: function(node) {
      return this.left = node;
    },
    getLeft: function() {
      return this.left;
    },
    setRight: function(node) {
      return this.right = node;
    },
    getRight: function() {
      return this.right;
    },
    setParent: function(node) {
      return this.parent = node;
    },
    getParent: function() {
      return this.parent;
    },
    postOrder: function(callback) {
      // post order traversal to an array
      // left, right, parent
      var currentNode = this,
          direction = null,
          output = [],
          i = 0;

      while (currentNode) {
        
        if (currentNode.getChildren().length > 0 && direction !== "up") {
          direction = "down";
          currentNode = currentNode.getChildren()[0];
          continue;
        }

        output.push(currentNode.getValue());

        if (currentNode.getRight()) {
          direction = "right";
          currentNode = currentNode.getRight();
          continue;
        }

        if (currentNode.getParent()) {
          direction = "up";
          currentNode = currentNode.getParent();
          continue;
        }

        if (callback) {
          for (i = 0, len = output.length; i < len; i++) {
            callback(output[i]);
          }
        }

        return output;
      }
    }
  };
});
