var TreeRunner = Fiber.extend(function() {
  /**
   * Perform a function on the next-tick, faster than setTimeout
   * Taken from stagas / public domain
   * By using window.postMessage, we can immediately queue a function
   * to run on the event stack once the current JS thread has completed.
   * For browsers that do not support postMessage, a setTimeout of 0 is
   * used instead.
   * @method TreeRunner.nextTick
   * @private
   * @param {Function} fn - the function to call on the next tick
   */
  var nextTick = (function() {
    var queue = [],
        hasPostMessage = !!window.postMessage,
        messageName = 'inject-nexttick',
        dirty = false,
        trigger,
        processQueue;
  
    function flushQueue () {
      var lQueue = queue;
      queue = [];
      dirty = false;
      fn = lQueue.shift();
      while (fn) {
        fn();
        fn = lQueue.shift();
      }
    }
  
    function nextTick (fn) {
      queue.push(fn);
      if (dirty) return;
      dirty = true;
      trigger();
    }
  
    if (hasPostMessage) {
      trigger = function () { window.postMessage(messageName, '*'); };
      processQueue = function (event) {
        if (event.source == window && event.data === messageName) {
          if (event.stopPropagation) {
            event.stopPropagation();
          }
          else {
            event.returnValue = false;
          }
          flushQueue();
        }
      };
      nextTick.listener = addListener(window, 'message', processQueue, true);
    }
    else {
      trigger = function () { window.setTimeout(function () { processQueue(); }, 0); };
      processQueue = flushQueue;
    }

    nextTick.removeListener = function () {
      removeListener(window, 'message', processQueue, true);
    };

    return nextTick;
  }());
  
  return {
    /**
     * Construct a Tree Runner Object
     * A tree runner, given a node, is responsible for the download and execution
     * of the root node and any children it encounters.
     * @constructs TreeRunner
     * @param {Object} env - The context to run in
     * @param {TreeNode} root - a Tree Node at the root of this tree
     */
    init: function(env, root) {
      this.env = env;
      this.root = root;
    },
    
    /**
     * Downloads the tree, starting from this node, and spanning into its children
     * @method TreeRunner#download
     * @public
     * @param {Function} downloadComplete - a callback executed when the download is done
     */
    download: function(downloadComplete) {

      var root = this.root,
          self = this,
          rootData = root.data,
          rootParent = root.getParent(),
          communicatorGet;

      // given original id & parent resolved id, create resolved id
      // given resolved id & parent resolved url, create resolved url
      // build a communicator
      // communicator download (async)
      // -- on complete (file)
      // -- transform the contents (rules)
      // -- assign file to child
      // -- extract requires
      // -- for each child, create children, up the children count by 1
      // -- in a next-tick, create a new TreeDownloader at the new child (async)
      // -- -- on complete, decrement children count by 1
      // -- -- when children count hits 0, call downloadComplete()
      if (rootParent) {
        rootData.resolvedId = this.env.rulesEngine.resolveModule(rootData.originalId, rootParent.data.resolvedId);
      }
      else {
        rootData.resolvedId = this.env.rulesEngine.resolveModule(rootData.originalId, '');
      }
      rootData.resolvedUrl = this.env.rulesEngine.resolveFile(rootData.resolvedId);

      // Build a communicator.
      communicatorGet = this.buildCommunicator(root);

      // Download the file via communicator, get back contents
      communicatorGet(rootData.originalId, rootData.resolvedUrl, function(content) {

        // build a flow control to adjust the contents based on rules
        var pointcuts = self.env.rulesEngine.getContentRules(rootData.resolvedUrl),
            contentFlow = new Flow(),
            i = 0,
            len = pointcuts.length;

            addContent = function(fn) {
              contentFlow.seq(function (next, error, contents) {
                try {
                  fn(function(data) {
                    next(null, data);
                  }, contents);
                }
                catch(e) {
                  next(e, contents);
                }
              });
            };

        contentFlow.seq(function (next) {
          next(null, content);
        });

        for (i; i < len; i++) {
          addContent(pointcuts[i]);
        }

        contentFlow.seq(function (next, error, contents) {

          var circular = false,
              searchIndex = {},
              parent = rootParent,
              module,
              qualifiedId;

          if (typeof contents === 'string') {
            rootData.file = contents;
          }
          else {
            rootData.exports = contents;
          }

          // determine if this is circular
          searchIndex[rootData.originalId] = true;
          while(parent && !circular) {
            if (searchIndex[parent.data.originalId]) {
              circular = true;
            }
            else {
              searchIndex[parent.data.originalId] = true;
              parent = parent.getParent();
            }
          }
          rootData.circular = circular;

          // kick off its children
          if (rootData.exports) {
            // when there are exports available, then we prematurely resolve this module
            // this can happen when the an external rule for the communicator has resolved
            // the export object for us
            module = self.env.executor.createModule(rootData.resolvedId, self.env.requireContext.qualifiedId(root), rootData.resolvedUrl);
            module.exec = true;
            module.exports = contents;
            downloadComplete();
          }
          else if (rootData.circular) {
            // circular nodes do not need to download their children (again)
            downloadComplete();
          }
          else {
            // Analyze the file for depenencies and kick off a child download for each one.
            self.downloadDependencies(root, proxy(downloadComplete, self));
          }
        });
      });
    },
    
    /**
     * Executes a tree, starting from the root node
     * In order to ensure a tree has all of its dependencies available
     * a post-order traversal is used
     * http://en.wikipedia.org/wiki/Tree_traversal#Post-order
     * This loads Bottom-To-Top, Left-to-Right
     * @method TreeRunner#execute
     * @public
     * @param {Function} executeComplete - a callback function ran when all execution is done
     */
    execute: function(executeComplete) {

      var nodes = this.root.postOrder(),
          self = this,
          len = nodes.length,
          i = 0,
      
          runNode = function(node) {

            var nodeData = node.data,
                module,
                result;

            if (!nodeData.resolvedId) {
              return;
            }
            
            // executor: create a module
            // if not circular, executor: run module (otherwise, the circular reference begins as empty exports)
            module = self.env.executor.createModule(nodeData.resolvedId, self.env.requireContext.qualifiedId(node), nodeData.resolvedUrl);
            nodeData.module = module;
            
            if (module.exec) {
              return;
            }
            
            if (!nodeData.circular) {
              if (nodeData.exports) {
                // exports came pre set
                module.exports = nodeData.exports;
                module.exec = true;
              }
              else if (typeof nodeData.file === 'string') {
                self.env.executor.runModule(module, nodeData.file);
                module.exec = true;
                // if this is an AMD module, it's exports are coming from define()
                if (!module.amd) {
                  nodeData.exports = module.exports;
                }
              }
            }
          };
      
      for (i; i < len; i++) {
        runNode(nodes[i]);
      }
      
      executeComplete();
    },
    
    /**
     * Build a communcator function. If there are fetch rules, create a flow control
     * to handle communication (as opposed to the internal communicator).
     *
     * @private
     * @param  {TreeNode} node      The TreeNode you're building the communicator for.
     * @return {Function}           The built communicator method.
     */
    buildCommunicator: function(node) {

      var nodeData = node.data,
          self = this,
          parentData = node.getParent() ? node.getParent().data : null,
          fetchRules = this.env.rulesEngine.getFetchRules(nodeData.resolvedId),
          commFlow = new Flow(),

          commFlowResolver = {
            module: function() { return self.env.rulesEngine.resolveModule.apply(self.env.rulesEngine, arguments); },
            url: function() { return self.env.rulesEngine.resolveFile.apply(self.env.rulesEngine, arguments); }
          },

          commFlowCommunicator = {
            get: function() { return self.env.communicator.get.apply(self.env.communicator, arguments); }
          },

          addComm = function(fn) {
            commFlow.seq(function(next, error, contents) {
              function onData(err, data) {
                next(null, data);
              }
              function onError(err) {
                next(err, contents);
              }
              try {
                fn(onData, contents, commFlowResolver, commFlowCommunicator, {
                  moduleId: nodeData.originalId,
                  parentId: (parentData) ? parentData.originalId : '',
                  parentUrl: (parentData) ? parentData.resolvedUrl : ''
                });
              }
              catch(e) {
                onError(e);
              }
            });
          };
    
      // for non-AMD modules, if the module is already resolved, return an empty string
      // which will cause the communicator to exit early and apply content rules if required
      // for AMD modules, we re-fetch every time due to the nature of dynamic modules
      if (nodeData.resolvedId.indexOf('!') === -1) {
        // is this module already available? If so, don't redownload. This happens often when
        // there was an inline define() on the page
        if (this.env.executor.getModule(nodeData.resolvedId)) {
          return function(a, b, cb) {
            cb('');
          };
        }

        else if (this.env.executor.getModule(this.env.requireContext.qualifiedId(node))) {
          return function(a, b, cb) {
            cb('');
          };
        }
      }

      if (fetchRules.length > 0) {
        return function(name, path, cb) {
          var i = 0,
              len = fetchRules.length;
          commFlow.seq(function(next) {
            next(null, '');
          });
          for (i; i < len; i++) {
            addComm(fetchRules[i]);
          }
          commFlow.seq(function (next, error, contents) {
            // If AMD is enabled, and it has a new ID, then assign that
            cb(contents);
          });
        };
      }

      return proxy(this.env.communicator.get, this.env.communicator);
    },

    /**
     * Fetch dependencies from child nodes and kick off downloads.
     *
     * @private
     * @param  {TreeNode}   node    The children's parent node.
     * @param  {Function} callback  A method to call when the downloading is complete.
     */
    downloadDependencies: function(node, callback) {

      var requires = this.env.analyzer.extractRequires(node.data.file),
          children = requires.length,
          i = 0,
          len = children,
          child,
          runner,
    
          childDone = function() {
            children--;
            if (children === 0) {
              callback();
            }
          },
    
          childRunner = function(r) {
            nextTick(function() {
              r.download(childDone);
            });
          };

      if (!requires.length) {
        return callback();
      }

      for (i; i < len; i++) {
        child = new TreeNode();
        child.data.originalId = requires[i];
        node.addChild(child);
      
        if (this.env.executor.getModule(requires[i]) && this.env.executor.getModule(requires[i]).exec) {
          // we have it
          childDone();
        }
        else {
          // go get it
          runner = new this.env.TreeRunner(this.env, child);
          childRunner(runner);
        }
      }
    }
  };
});
