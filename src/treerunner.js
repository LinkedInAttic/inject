var TreeRunner = Fiber.extend(function () {
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

  /**
   * Build a communcator function. If there are fetch rules, create a flow control
   * to handle communication (as opposed to the internal communicator).
   *
   * @private
   * @param  {[type]} node       [description]
   * @return {[type]}              [description]
   */
  function buildCommunicator(node) {

    var nodeData = node.data,
        parentData = node.getParent() ? node.getParent().data : null,
        fetchRules = RulesEngine.getFetchRules(nodeData.resolvedId),
        commFlow = new Flow(),

        commFlowResolver = {
          module: function() { return RulesEngine.resolveModule.apply(RulesEngine, arguments); },
          url: function() { return RulesEngine.resolveFile.apply(RulesEngine, arguments); }
        },

        commFlowCommunicator = {
          get: function() { return Communicator.get.apply(Communicator, arguments); }
        },

        addComm = function(fn) {
          commFlow.seq(function(next, error, contents) {
            fn(next, contents, commFlowResolver, commFlowCommunicator, {
              moduleId: nodeData.originalId,
              parentId: (parentData) ? parentData.originalId : '',
              parentUrl: (parentData) ? parentData.resolvedUrl : ''
            });
          });
        };
    
    // is this module already available? If so, don't redownload. This happens often when
    // there was an inline define() on the page
    if (Executor.getModule(nodeData.resolvedId)) {
      return function(a, b, cb) {
        cb('');
      };
    }

    else if (Executor.getModule(RequireContext.qualifiedId(node))) {
      return function(a, b, cb) {
        cb('');
      };
    }

    else if (fetchRules.length > 0) {
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

    return Communicator.get;
  }

  function downloadDependencies(node, callback) {

    var requires = Analyzer.extractRequires(node.data.file),
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
      
      if (Executor.getModule(requires[i]) && Executor.getModule(requires[i]).exec) {
        // we have it
        childDone();
      }
      else {
        // go get it
        runner = new TreeRunner(child);
        childRunner(runner);
      }
    }
  }
  
  return {
    /**
     * Construct a Tree Runner Object
     * A tree runner, given a node, is responsible for the download and execution
     * of the root node and any children it encounters.
     * @constructs TreeRunner
     * @param {TreeNode} root - a Tree Node at the root of this tree
     */
    init: function(root) {
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
        rootData.resolvedId = RulesEngine.resolveModule(rootData.originalId, rootParent.data.resolvedId);
      }
      else {
        rootData.resolvedId = RulesEngine.resolveModule(rootData.originalId, '');
      }
      rootData.resolvedUrl = RulesEngine.resolveFile(rootData.resolvedId);

      // Build a communicator.
      communicatorGet = buildCommunicator(root);

      // Download the file via communicator, get back contents
      communicatorGet(rootData.originalId, rootData.resolvedUrl, function(content) {

        // build a flow control to adjust the contents based on rules
        var pointcuts = RulesEngine.getContentRules(rootData.resolvedUrl),
            contentFlow = new Flow(),
            i = 0,
            len = pointcuts.length;

            addContent = function(fn) {
              contentFlow.seq(function (next, error, contents) {
                fn(next, contents);
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
            module = Executor.createModule(rootData.resolvedId, RequireContext.qualifiedId(root), rootData.resolvedUrl);
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
            downloadDependencies(root, downloadComplete);
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
            module = Executor.createModule(nodeData.resolvedId, RequireContext.qualifiedId(node), nodeData.resolvedUrl);
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
                Executor.runModule(module, nodeData.file);
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
    }
  };
});