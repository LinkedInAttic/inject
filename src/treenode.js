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
 * The TreeNode is a data structure object for building N-ary
 * trees. It also collects methods for iterating on itself
 * via various traversal methods.
 * @file
**/
var TreeNode = Class.extend(function() {
  return {
    /**
     * Create a TreeNode with a defined value
     * @constructs TreeNode
     * @param {TreeNode} value - the value of this node
     */
    init: function(value) {
      this.value = value;
      this.children = [];
      this.left = null;
      this.right = null;
      this.parent = null;
      this.isCircularNode = false;
    },

    /**
     * Get the value associated with the TreeNode
     * @method TreeNode#getValue
     * @public
     * @returns {variable} the value of the node
     */
    getValue: function() {
      return this.value;
    },

    /**
     * Flag this tree node as circular
     * @method flagCircular
     * @public
     */
    flagCircular: function() {
      this.isCircularNode = true;
    },
    isCircular: function() {
      return this.isCircularNode;
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

        // node correct
        output.push(currentNode.getValue());
        if (callback) {
          callback(currentNode);
        }
        // end node correct

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

        return output;
      }
    }
  };
});
