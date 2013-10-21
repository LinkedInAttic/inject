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
  var nextTick = (function () {
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
        if (event.source === window && event.data === messageName) {
          event.stopPropagation();
          flushQueue();
        }
      };
      nextTick.listener = window.addEventListener('message', processQueue, true);
    }
    else {
      trigger = function () { window.setTimeout(function () { processQueue(); }, 0); };
      processQueue = flushQueue;
    }

    nextTick.removeListener = function () {
      window.removeEventListener('message', processQueue, true);
    };

    return nextTick;
  }());
  
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
      var root = this.root;
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
      if (root.getParent()) {
        root.data.resolvedId = RulesEngine.resolveModule(root.data.originalId, root.getParent().data.resolvedId);
      }
      else {
        root.data.resolvedId = RulesEngine.resolveModule(root.data.originalId, '');
      }
      root.data.resolvedUrl = RulesEngine.resolveFile(root.data.resolvedId);
      
      // select a communcator function. If there are fetch rules, create a flow control
      // to handle communication (as opposed to the internal communicator)
      var communicatorGet = Communicator.get;
      var fetchRules = RulesEngine.getFetchRules(root.data.resolvedId);
      var commFlow = new Flow();
      var commFlowResolver = {
        module: function() { return RulesEngine.resolveModule.apply(RulesEngine, arguments); },
        url: function() { return RulesEngine.resolveFile.apply(RulesEngine, arguments); }
      };
      var commFlowCommunicator = {
        get: function() { return Communicator.get.apply(Communicator, arguments); }
      };
      var addComm = function(fn) {
        commFlow.seq(function(next, error, contents) {
          fn(next, contents, commFlowResolver, commFlowCommunicator, {
            moduleId: root.data.originalId,
            parentId: (root.getParent()) ? root.getParent().data.originalId : '',
            parentUrl: (root.getParent()) ? root.getParent().data.resolvedUrl : ''
          });
        });
      };
      
      if (fetchRules.length > 0) {
        communicatorGet = function(name, path, cb) {
          commFlow.seq(function(next) {
            next(null, '');
          });
          for (var i = 0, len = fetchRules.length; i < len; i++) {
            addComm(fetchRules[i]);
          }
          commFlow.seq(function (next, error, contents) {
            // If AMD is enabled, and it has a new ID, then assign that
            cb(contents);
          });
        };
      }
      
      // download the file via communicator, get back contents
      communicatorGet(root.data.originalId, root.data.resolvedUrl, function(content) {
        // build a flow control to adjust the contents based on rules
        var pointcuts = RulesEngine.getContentRules(root.data.resolvedUrl);
        var contentFlow = new Flow();
        var addContent = function(fn) {
          contentFlow.seq(function (next, error, contents) {
            fn(next, contents);
          });
        };
        contentFlow.seq(function (next) {
          next(null, content);
        });
        for (var i = 0, len = pointcuts.length; i < len; i++) {
          addContent(pointcuts[i]);
        }
        contentFlow.seq(function (next, error, contents) {
          if (typeof contents === 'string') {
            root.data.file = contents;
          }
          else {
            root.data.exports = contents;
          }

          // determine if this is circular
          var circular = false;
          var searchIndex = {};
          var parent = root.getParent();
          var module;
          var qualifiedId;
          searchIndex[root.data.originalId] = true;
          while(parent && !circular) {
            if (searchIndex[parent.data.originalId]) {
              circular = true;
            }
            else {
              searchIndex[parent.data.originalId] = true;
              parent = parent.getParent();
            }
          }
          root.data.circular = circular;

          // kick off its children
          if (root.data.exports) {
            // when there are exports available, then we prematurely resolve this module
            // this can happen when the an external rule for the communicator has resolved
            // the export object for us
            module = Executor.createModule(root.data.resolvedId, RequireContext.qualifiedId(root), root.data.resolvedUrl);
            module.exec = true;
            module.exports = contents;
            downloadComplete();
          }
          else if (root.data.circular) {
            // circular nodes do not need to download their children (again)
            downloadComplete();
          }
          else {
            // analyze the file for depenencies, kick off a child download for each one
            var requires = Analyzer.extractRequires(root.data.file);
            var children = requires.length;
            var childDone = function() {
              children--;
              if (children === 0) {
                downloadComplete();
              }
            };
            
            var childRunner = function(r) {
              nextTick(function() {
                r.download(childDone);
              });
            };

            if (requires.length === 0) {
              return downloadComplete();
            }

            for (var i = 0, len = requires.length; i < len; i++) {
              var node = new TreeNode();
              node.data.originalId = requires[i];
              root.addChild(node);
              var runner = new TreeRunner(node);
              childRunner(runner);
            }
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
      var nodes = this.root.postOrder();
      
      var runNode = function(node) {
        if (!node.data.resolvedId) {
          return;
        }
        var module;
        var result;
        
        // executor: create a module
        // if not circular, executor: run module (otherwise, the circular reference begins as empty exports)
        module = Executor.createModule(node.data.resolvedId, RequireContext.qualifiedId(node), node.data.resolvedUrl);
        node.data.module = module;
        
        if (module.exec) {
          return;
        }
        
        if (!node.data.circular) {
          if (node.data.exports) {
            // exports came pre set
            module.exports = node.data.exports;
            module.exec = true;
          }
          else if (typeof node.data.file === 'string') {
            Executor.runModule(module, node.data.file);
            module.exec = true;
            // if this is an AMD module, it's exports are coming from define()
            if (!module.amd) {
              node.data.exports = module.exports;
            }
          }
        }
      };
      
      for (var i = 0, len = nodes.length; i < len; i++) {
        runNode(nodes[i]);
      }
      
      executeComplete();
    }
  };
});