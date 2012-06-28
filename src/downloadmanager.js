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

var DownloadManager;
(function() {

  // we internalize the DM class so they can all share a static cache
  var DM = Class.extend(function() {
    function downloadTree(node, callback) {
      // get the path of the current node (or root)

      // if node has no children, callback - bottom of tree


    }

    return {
      init: function() {},
      download: function(moduleIds, callback) {
        if (String.toString.call( moduleIds ) !== "[object Array]") {
          moduleIds = [moduleIds];
        }

        var root = new TreeNode(null);
        var node;

        for (var i = 0, len = moduleIds.length; i < len; i++) {
          node = new TreeNode(moduleIds[i]);
          root.addChild(node);
        }

        // download the tree, then pass the root back
        downloadTree(root, function() {
          callback(root);
        });
      }
    };
  });
  DownloadManager = DM;
})();