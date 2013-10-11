// nextTick - by stagas / public domain
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

var TreeRunner = Fiber.extend(function () {
  return {
    init: function(root) {
      this.root = root;
    },
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
      
      if (RulesEngine.getFetchRules(root.data.resolvedUrl).length > 0) {
        communicatorGet = function(name, path, cb) {
          commFlow.seq(function(next) {
            next(null, '');
          });
          for (var i = 0, len = fetchRules.length; i < len; i++) {
            addToCommFlow(fetchRules[i]);
          }
          commFlow.seq(function (next, error, contents) {
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
          makeFlow(pointcuts[i]);
        }
        contentFlow.seq(function (next, error, contents) {
          root.data.file = contents;

          // determine if this is circular
          var circular = false;
          var searchIndex = {};
          var parent = root.getParent();
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
          if (typeof contents === 'object') {
            root.data.exports = contents;
            downloadComplete();
          }
          else if (root.data.circular) {
            // circular nodes do not need to download their children (again)
            downloadComplete();
          }
          else {
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
    execute: function(executeComplete) {
      var nodes = this.root.postOrder();
      
      var runNode = function(node) {
        if (!node.data.resolvedId) {
          return;
        }
        var module;
        
        // executor: create a module
        // if not circular, executor: run module (otherwise, the circular reference begins as empty exports)
        module = Executor.createModule(node.data.resolvedId, node.data.resolvedUrl);
        
        if (Executor.getModule(node.data.resolvedId).exec) {
          return;
        }
        
        Executor.setModule(node.data.resolvedId, module);
        if (!node.data.circular) {
          if (typeof node.data.file === 'string') {
            module = Executor.runModule(node.data.resolvedId, node.data.file, node.data.resolvedUrl);
            module.exec = true;
            // if this is an AMD module, it's define() is back on the stack, so we're back to async
            if (!module.amd) {
              node.data.exports = module.exports;
              Executor.setModule(node.data.resolvedId, module);
            }
          }
          else {
            module.exec = true;
            Executor.setModule(node.data.resolvedId, module);
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