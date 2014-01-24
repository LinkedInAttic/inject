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
var TreeNode = Fiber.extend(function() {

  return {
    /**
     * Create a TreeNode
     * @constructs TreeNode
     */
    init: function () {
      this.data = {};
      this.children = [];
      this.left = null;
      this.right = null;
      this.parent = null;
    },

    /**
     * Add a child to the node. It also sets up left
     * and right relationships as well as the parent.
     * @method TreeNode#addChild
     * @param {TreeNode} node - the TreeNode to add
     * @public
     */
    addChild: function (node) {
      var rightChild;
      if (this.children.length > 0) {
        rightChild = this.children[this.children.length - 1];
        node.setLeft(rightChild);
        rightChild.setRight(node);
      }
      this.children.push(node);
      return node.setParent(this);
    },

    /**
     * Get all the children of this node
     * @method TreeNode#getChildren
     * @public
     * @returns {Array} an array of child TreeNode objects
     */
    getChildren: function () {
      return this.children;
    },

    /**
     * An interface for setting the "left" node of the tree
     * @method TreeNode#setLeft
     * @param {TreeNode} node - the node to set
     * @public
     * @returns {TreeNode}
     */
    setLeft: function (node) {
      this.left = node;
      return this.left;
    },

    /**
     * Get the node "left" of the current
     * @method TreeNode#getLeft
     * @public
     * @returns {TreeNode}
     */
    getLeft: function () {
      return this.left;
    },

    /**
     * An interface for setting the "right" node of the tree
     * @method TreeNode#setRight
     * @param {TreeNode} node - the node to set
     * @public
     * @returns {TreeNode}
     */
    setRight: function (node) {
      this.right = node;
      return this.right;
    },

    /**
     * Get the node "right" of the current
     * @method TreeNode#getRight
     * @public
     * @returns {TreeNode}
     */
    getRight: function () {
      return this.right;
    },

    /**
     * An interface for setting the "parent" node of current
     * @method TreeNode#setParent
     * @param {TreeNode} node - the node to set
     * @public
     * @returns {TreeNode}
     */
    setParent: function (node) {
      this.parent = node;
      return this.parent;
    },

    /**
     * Get the node "parent" of the current
     * @method TreeNode#getParent
     * @public
     * @returns {TreeNode}
     */
    getParent: function () {
      return this.parent;
    },
    
    /**
     * Returns all of a requested data element for the parents
     * @method TreeNode#parents
     * @param {String} param - the data paramter to get
     * @param {string} joins - the string to join it
     * @returns {Array} - an array of the parent values
     */
    parents: function(callback) {
      var output = [],
          currentNode = this;
      
      while (currentNode) {
        if (callback) {
          callback(currentNode);
        }
        output.push(currentNode);
        currentNode = currentNode.getParent();
      }
      
      return output;
    },

    /**
     * Perform a postOrder traversal over the tree, optionally running
     * a supplied callback
     * @method TreeNode#postOrder
     * @param {Function} callback - a callback to run for each node
     * @public
     * @returns {Array} the nodes of the tree, ordered by post-order
     */
    postOrder: function (callback) {
      // post order traversal to an array
      // left, right, parent
      var currentNode = this,
          direction = null,
          output = [];

      while (currentNode) {

        if (currentNode.getChildren().length > 0 && direction !== 'up') {
          direction = 'down';
          currentNode = currentNode.getChildren()[0];
          continue;
        }

        // node correct
        output.push(currentNode);
        if (callback) {
          callback(currentNode);
        }
        // end node correct

        if (currentNode.getRight()) {
          direction = 'right';
          currentNode = currentNode.getRight();
          continue;
        }

        if (currentNode.getParent()) {
          direction = 'up';
          currentNode = currentNode.getParent();
          continue;
        }

        return output;
      }
    }
  };
});
