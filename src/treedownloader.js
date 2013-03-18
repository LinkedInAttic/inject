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
 * TreeDownloader, as its name implies, downloads a tree starting
 * at its root node. Once all nodes have been downloaded, a
 * callback can be invoked. Circular references are resolved
 * into a downloaded state and the TreeNode object is flagged
 * as downloaded.
 * @file
**/
var TreeDownloader = Fiber.extend(function () {
  return {
    /**
     * Create a TreeDownloader with a root node. From this node,
     * it and its children can be analyzed and downloaded
     * @constructs TreeDownloader
     * @param {TreeNode} root - the root TreeNode to download
     */
    init: function (root) {
      this.callsRemaining = 0;
      this.root = root;
      this.files = {};
    },

    /**
     * A logging function to help keep track of which "root" a call
     * comes from
     * @method TreeDownloader#log
     * @param {variable} args - a collection of args to output
     * @protected
     */
    log: function () {
      var args = [].slice.call(arguments, 0);
      var name = (this.root.getValue()) ? this.root.getValue().name : null;
      debugLog('TreeDownloader (' + name + ')', args.join(' '));
    },

    /**
     * Reduces the total number of calls remaining
     * If the calls reach 0, the callback is invoked with the provided
     * arguments
     * @method TreeDownloader#reduceCallsRemaining
     * @param {function} callback - a callback to run if 0 calls remain
     * @param {array} args - a collection of arguments for callback
     * @protected
     */
    reduceCallsRemaining: function (callback, args) {
      this.callsRemaining--;
      this.log('reduce. outstanding', this.callsRemaining);
      // TODO: there is a -1 logic item here to fix
      if (this.callsRemaining <= 0) {
        callback.call(null, args);
      }
    },

    /**
     * increase the total number of calls remaining
     * @method TreeDownloader#increaseCallsRemaining
     * @param {int} by - an amount to increase by, defaults to 1
     * @protected
     */
    increaseCallsRemaining: function (by) {
      this.callsRemaining += by || 1;
      this.log('increase. outstanding', this.callsRemaining);
    },

    /**
     * get a collection of the files downloaded
     * @method TreeDownloader#getFiles
     * @public
     * @returns {object} an object containing url/file pairs
     */
    getFiles: function () {
      return this.files;
    },

    /**
     * download the tree, invoking a callback on completion
     * This recursively downloads an entire tree
     * Consider the following tree:
     * <pre>
     *     root
     *     /  \
     *    A    B
     *   / \   |
     *  B   C  D
     *  |      |
     *  D      A
     *  |     / \
     * (A)  (B)  C
     * </pre>
     * root: no-download. Add A, Add B. Spawn A, Spawn B // count = 0 + 2 = 2 (add A, add B)<br>
     * A: download. Add B, Add C. Spawn C (B logged) // count = 2 - 1 + 1 = 2 (remove A, add C)<br>
     * B: download. Add D. Spawn D // count = 2 - 1 + 1 = 2 (remove B, add D)<br>
     * C: download // count = 2 - 1 = 1 (remove C)<br>
     * D: download // count = 1 - 1 = 0 (remove D)
     * @method TreeDownloader#get
     * @param {function} callback - a callback invoked on completion
     * @public
     */
    get: function (callback) {
      this.log('started download');
      this.downloadTree(this.root, proxy(function () {
        callback(this.root, this.getFiles());
      }, this));
    },

    /**
     * The recursive loop of tree downloading, spawned by the top
     * level get() call. A callback is called at the "complete" state,
     * when all its dependencies have also been downloaded.
     * @method TreeDownloader#downloadTree
     * @param {TreeNode} node - a TreeNode to download and analyze
     * @param {function} callback - a callback to invoke when this node is "complete"
     * @protected
     */
    downloadTree: function (node, callback) {
      // Normalize Module Path. Download. Analyze.
      var parentName =  (node.getParent() && node.getParent().getValue()) ?
                         node.getParent().getValue().resolvedId :
                         '';
      var getFunction = null;

      // get the path and REAL identifier for this module (resolve relative references)
      var identifier = RulesEngine.resolveIdentifier(node.getValue().name, parentName);

      // modules are relative to identifiers, not to URLs
      node.getValue().path = RulesEngine.resolveUrl(identifier);

      node.getValue().resolvedId = identifier;

      // top level starts at 1
      if (!node.getParent()) {
        this.increaseCallsRemaining();
      }

      // do not bother to download AMD define()-ed files
      if (Executor.isModuleDefined(node.getValue().name)) {
        this.log('AMD defined module, no download required', node.getValue().name);
        this.reduceCallsRemaining(callback, node);
        return;
      }

      this.log('requesting file', node.getValue().path);
      getFunction = (node.getValue().path) ? Communicator.get : Communicator.noop;
      getFunction(node.getValue().name, node.getValue().path, proxy(function (contents) {
        this.log('download complete', node.getValue().path);

        /*
        IMPORTANT
        This next section uses a flow control library, as afterDownload is the "new" style
        pointcut. It enables cool stuff like making external requests as part of the mutation,
        direct assignment, and more. The flow library we use is intentionally very simple.
        Please see https://github.com/jeromeetienne/gowiththeflow.js to learn more about the
        really small library we opted to use.
        */

        // afterFetch pointcut if available
        // this.pointcuts[resolvedUrl] = result.pointcuts;
        var pointcuts = RulesEngine.getPointcuts(node.getValue().path);
        var pointcutsStr = RulesEngine.getPointcuts(node.getValue().path, true);
        var afterFetch = pointcuts.afterFetch || [];
        var parentName = (node.getParent()) ? node.getParent().getValue().name : '';
        var parentUrl = (node.getParent()) ? node.getParent().getValue().path : '';

        // create a new flow control object and prime it with our contents
        var apFlow = new Flow();
        apFlow.seq(function (next) {
          next(null, contents);
        });

        // for every "after fetch" download, call it with contents, moduleName, and parentName
        var makeFlow = function (i) {
          apFlow.seq(function (next, error, contents) {
            afterFetch[i](next, contents, node.getValue().name, parentName, parentUrl);
          });
        };
        for (var i = 0, len = afterFetch.length; i < len; i++) {
          makeFlow(i);
        }

        // once all contents are resolved, see if we have an object (a neat assignment trick)
        // or a string. If we get an object, assign it to a special exports that says it was
        // invoked FROM a specific location. This helps require() find the module later
        apFlow.seq(proxy(function (next, error, contents) {
          if (typeof(contents) !== 'string' && typeof(contents) === 'object') {
            Executor.assignModule(parentName, identifier, node.getValue().path, contents);
            return this.reduceCallsRemaining(callback, node);
          }
          if (typeof(contents) === 'undefined') {
            // no content was returned at all. This happens when there is explicitly nothing to eval
            return this.reduceCallsRemaining(callback, node);
          }

          var before = (pointcutsStr.before) ? [pointcutsStr.before, '\n'].join('') : '';
          var after = (pointcutsStr.after) ? [pointcutsStr.after, '\n'].join('') : '';
          contents = [before, contents, after].join('');

          var parent = node;
          var found = {};
          var value;

          // seed found with the first item
          found[node.getValue().name] = true;
          parent = parent.getParent();
          // test if you are a circular reference. check every parent back to root
          while (parent) {
            if (!parent.getValue()) {
              // reached root
              break;
            }

            value = parent.getValue().name;
            if (found[value]) {
              this.log('circular reference found', node.getValue().name);
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

            var results = Analyzer.extractRequires(contents);
            var tempRequires = results;
            var requires = [];
            var childNode;
            var name;
            var path;
            var i;
            var callReduceCommand = proxy(function () {
              this.reduceCallsRemaining(callback, node);
            }, this);

            // remove already-defined AMD modules before we go further
            for (i = 0, len = tempRequires.length; i < len; i++) {
              name = RulesEngine.resolveIdentifier(tempRequires[i], node.getValue().resolvedId);
              if (!Executor.isModuleDefined(name) && !Executor.isModuleDefined(tempRequires[i])) {
                requires.push(tempRequires[i]);
              }
            }

            this.log('dependencies (' + requires.length + '):' + requires.join(', '));

            // for each requires, create a child and spawn
            if (requires.length) {
              this.increaseCallsRemaining(requires.length);
            }
            for (i = 0, len = requires.length; i < len; i++) {
              name = (results.amd) ? RulesEngine.resolveIdentifier(requires[i], node.getValue().resolvedId): requires[i];
              path = ''; // calculate path on recusion using parent
              childNode = TreeDownloader.createNode(name, path);
              node.addChild(childNode);
              this.downloadTree(childNode, callReduceCommand);
            }
          }

          // if contents was a literal false, we had an error
          if (contents === false) {
            node.getValue().failed = true;
          }

          // this module is processed
          this.reduceCallsRemaining(callback, node);
        }, this));
      }, this));
    }
  };
});
/**
 * Create a TreeNode object through a factory
 * @method TreeDownloader.createNode
 * @param {string} name - the moduleId for the tree node
 * @param {string} path - the URL for the module
 * @public
 * @returns {TreeNode} the created TreeNode object
 */
TreeDownloader.createNode = function (name, path) {
  var tn = new TreeNode({
    name: name,
    path: path,
    failed: false
  });
  return tn;
};
