// internal database of modules and transactions (see reset)
var _db = {};

var db = {
  /*
    ## db{} ##
    this is the database for all registries and queues
    to reduce maintenance headaches, all accessing is done through this
    object, and not the _db object
  */

  "module": {
    /*
        ## db.module{} ##
        These functions manipulate the module registry
    */

    "create": function(moduleId) {
      /*
            ## create(moduleId) ##
            create a registry entry for tracking a module
      */

      var registry;
      registry = _db.moduleRegistry;
      if (!registry[moduleId]) {
        return registry[moduleId] = {
          "failed": false,
          "exports": null,
          "path": null,
          "file": null,
          "amd": false,
          "loading": false,
          "executed": false,
          "rulesApplied": false,
          "requires": [],
          "exec": null,
          "pointcuts": {
            "before": [],
            "after": []
          }
        };
      }
    },
    "getExports": function(moduleId) {
      /*
            ## getExports(moduleId) ##
            get the exports for a given moduleId
      */

      var registry, _ref, _ref1;
      registry = _db.moduleRegistry;
      if (db.module.getFailed(moduleId)) {
        return false;
      }
      if ((_ref = registry[moduleId]) != null ? _ref.exports : void 0) {
        return registry[moduleId].exports;
      }
      if ((_ref1 = registry[moduleId]) != null ? _ref1.exec : void 0) {
        registry[moduleId].exec();
        registry[moduleId].exec = null;
        return registry[moduleId].exports;
      }
      return false;
    },
    "setExports": function(moduleId, exports) {
      /*
            ## setExports(moduleId, exports) ##
            set the exports for moduleId
      */

      var registry;
      registry = _db.moduleRegistry;
      db.module.create(moduleId);
      return registry[moduleId].exports = exports;
    },
    "getPointcuts": function(moduleId) {
      /*
            ## getPointcuts(moduleId) ##
            get the pointcuts for a given moduleId
      */

      var registry, _ref;
      registry = _db.moduleRegistry;
      if ((_ref = registry[moduleId]) != null ? _ref.pointcuts : void 0) {
        return registry[moduleId].pointcuts;
      }
    },
    "setPointcuts": function(moduleId, pointcuts) {
      /*
            ## setPointcuts(moduleId, pointcuts) ##
            set the pointcuts for moduleId
      */

      var registry;
      registry = _db.moduleRegistry;
      db.module.create(moduleId);
      return registry[moduleId].pointcuts = pointcuts;
    },
    "getRequires": function(moduleId) {
      /*
            ## getRequires(moduleId) ##
            get the requires for a given moduleId found at runtime
      */

      var registry, _ref;
      registry = _db.moduleRegistry;
      if ((_ref = registry[moduleId]) != null ? _ref.requires : void 0) {
        return registry[moduleId].requires;
      }
    },
    "setRequires": function(moduleId, requires) {
      /*
            ## setRequires(moduleId, requires) ##
            set the runtime dependencies for moduleId
      */

      var registry;
      registry = _db.moduleRegistry;
      db.module.create(moduleId);
      return registry[moduleId].requires = requires;
    },
    "getRulesApplied": function(moduleId) {
      /*
            ## getRulesApplied(moduleId) ##
            get the status of the rulesApplied flag. It's set when it has passed through
            the rules queue
      */

      var registry, _ref;
      registry = _db.moduleRegistry;
      if ((_ref = registry[moduleId]) != null ? _ref.rulesApplied : void 0) {
        return registry[moduleId].rulesApplied;
      } else {
        return false;
      }
    },
    "setRulesApplied": function(moduleId, rulesApplied) {
      /*
            ## setRulesApplied(moduleId, rulesApplied) ##
            set the rules applied flag for moduleId once all rules have been applied
      */

      var registry;
      registry = _db.moduleRegistry;
      db.module.create(moduleId);
      return registry[moduleId].rulesApplied = rulesApplied;
    },
    "getPath": function(moduleId) {
      /*
            ## getPath(moduleId) ##
            get the resolved path for a given moduleId
      */

      var registry, _ref;
      registry = _db.moduleRegistry;
      if ((_ref = registry[moduleId]) != null ? _ref.path : void 0) {
        return registry[moduleId].path;
      } else {
        return false;
      }
    },
    "setPath": function(moduleId, path) {
      /*
            ## setPath(moduleId, path) ##
            set the path for moduleId
      */

      var registry;
      registry = _db.moduleRegistry;
      db.module.create(moduleId);
      return registry[moduleId].path = path;
    },
    "getFile": function(moduleId) {
      /*
            ## getFile(moduleId) ##
            get the file for a given moduleId. If it doesn't exist in the registry,
            look for the object in localStorage. Return false if no matches are found
      */

      var file, path, registry, _ref;
      registry = _db.moduleRegistry;
      path = db.module.getPath(moduleId);
      if ((_ref = registry[moduleId]) != null ? _ref.file : void 0) {
        return registry[moduleId].file;
      }
      if (userConfig.fileExpires === 0) {
        return false;
      }
      if (hasLocalStorage) {
        file = lscache.get(path);
      }
      if (file && typeof file === "string" && file.length) {
        db.module.setFile(moduleId, file);
        return file;
      }
      return false;
    },
    "setFile": function(moduleId, file) {
      /*
            ## setFile(moduleId, file) ##
            set the file contents for moduleId, and update localStorage
      */

      var path, registry;
      registry = _db.moduleRegistry;
      db.module.create(moduleId);
      registry[moduleId].file = file;
      path = db.module.getPath(moduleId);
      if (hasLocalStorage) {
        return lscache.set(path, file, userConfig.fileExpires);
      }
    },
    "clearAllFiles": function() {
      /*
            ## clearAllFiles() ##
            remove all files from the registry. It sets them all back to an unloaded state
      */

      var data, moduleId, registry, _results;
      registry = _db.moduleRegistry;
      _results = [];
      for (moduleId in registry) {
        if (!__hasProp.call(registry, moduleId)) continue;
        data = registry[moduleId];
        data.file = null;
        _results.push(data.loading = false);
      }
      return _results;
    },
    "getFailed": function(moduleId) {
      /*
            ## getFailed(moduleId) ##
            get the status of the failed flag. It's set when a module fails to load
      */

      var registry, _ref;
      registry = _db.moduleRegistry;
      if ((_ref = registry[moduleId]) != null ? _ref.failed : void 0) {
        return registry[moduleId].failed;
      } else {
        return false;
      }
    },
    "setFailed": function(moduleId, failed) {
      /*
            ## setFailed(moduleId, failed) ##
            get the status of the failed flag. It's set when a module fails to load
      */

      var registry;
      registry = _db.moduleRegistry;
      db.module.create(moduleId);
      return registry[moduleId].failed = failed;
    },
    "getCircular": function(moduleId) {
      /*
            ## getFailed(moduleId) ##
            get the status of the circular flag. It's set when a module has a circular dependency
      */

      var registry, _ref;
      registry = _db.moduleRegistry;
      if ((_ref = registry[moduleId]) != null ? _ref.circular : void 0) {
        return registry[moduleId].circular;
      } else {
        return false;
      }
    },
    "setCircular": function(moduleId, circular) {
      /*
            ## setFailed(moduleId, failed) ##
            get the status of the circular flag. It's set when a module has a circular dependency
      */

      var registry;
      registry = _db.moduleRegistry;
      db.module.create(moduleId);
      return registry[moduleId].circular = circular;
    },
    "getAmd": function(moduleId) {
      /*
            ## getAmd(moduleId) ##
            get the status of the amd flag. It's set when a module is defined use AMD
      */

      var registry, _ref;
      registry = _db.moduleRegistry;
      if ((_ref = registry[moduleId]) != null ? _ref.amd : void 0) {
        return registry[moduleId].amd;
      } else {
        return false;
      }
    },
    "setAmd": function(moduleId, isAmd) {
      /*
            ## setAmd(moduleId, isAmd) ##
            set the amd flag for moduleId, It's set when a module is defined use AMD
      */

      var registry;
      registry = _db.moduleRegistry;
      db.module.create(moduleId);
      return registry[moduleId].amd = isAmd;
    },
    "getLoading": function(moduleId) {
      /*
            ## getLoading(moduleId) ##
            get the status of the loading flag. It's set when an item begins download,
            and cleared when the download completes and the file is saved
      */

      var registry, _ref;
      registry = _db.moduleRegistry;
      if ((_ref = registry[moduleId]) != null ? _ref.loading : void 0) {
        return registry[moduleId].loading;
      } else {
        return false;
      }
    },
    "setLoading": function(moduleId, loading) {
      /*
            ## setLoading(moduleId, loading) ##
            set the loading flag for moduleId, It's set when an item begins download
      */

      var registry;
      registry = _db.moduleRegistry;
      db.module.create(moduleId);
      return registry[moduleId].loading = loading;
    },
    "getExecuted": function(moduleId) {
      /*
            ## getExecuted(moduleId) ##
            get the status of the executed flag. It's set when a module is evalled
      */

      var registry, _ref;
      registry = _db.moduleRegistry;
      if ((_ref = registry[moduleId]) != null ? _ref.executed : void 0) {
        return registry[moduleId].executed;
      } else {
        return false;
      }
    },
    "setExecuted": function(moduleId, executed) {
      /*
            ## setExecuted(moduleId, executed) ##
            set the executed flag for moduleId, It's set when an item is evaled
      */

      var registry;
      registry = _db.moduleRegistry;
      db.module.create(moduleId);
      return registry[moduleId].executed = executed;
    }
  },
  "txn": {
    /*
        ## db.txn{} ##
        These methods manipulate the transaction registry
    */

    "create": function() {
      /*
            ## create() ##
            Create a transaction so we can count outstanding requests
      */

      var id;
      id = _db.transactionRegistryCounter++;
      _db.transactionRegistry[id] = 0;
      return id;
    },
    "add": function(txnId) {
      /*
            ## add(txnId) ##
            increment the counter for a given transaction id
      */
      return _db.transactionRegistry[txnId]++;
    },
    "subtract": function(txnId) {
      /*
            ## subtract(txnId) ##
            decrement the counter for a given transaction id
      */
      return _db.transactionRegistry[txnId]--;
    },
    "get": function(txnId) {
      /*
            ## get(txnId) ##
            Get the number of outstanding transactions for a given transaction id
      */
      return _db.transactionRegistry[txnId];
    },
    "remove": function(txnId) {
      /*
            ## remove(txnId) ##
            Remove a transaction entry from the registry
      */
      _db.transactionRegistry[txnId] = null;
      return delete _db.transactionRegistry[txnId];
    }
  },
  "queue": {
    "load": {
      /*
            ## db.queue.load{} ##
            these methods affect the load queue, tracking callback requests
            when loading is blocked for a cross domain iframe
      */

      "add": function(item) {
        return _db.loadQueue.push(item);
      },
      "get": function() {
        return _db.loadQueue;
      },
      "clear": function() {
        return _db.loadQueue = [];
      }
    },
    "rules": {
      /*
            ## db.queue.rules{} ##
            these methods affect the rules queue, tracking rules placed into
            the system via addRule(). Any time the rules are dirty, we sort them
            on get()
      */

      "add": function(item) {
        _db.rulesQueue.push(item);
        return _db.rulesQueueDirty = true;
      },
      "get": function() {
        if (_db.rulesQueueDirty) {
          _db.rulesQueueDirty = false;
          _db.rulesQueue.sort(function(a, b) {
            return b.weight - a.weight;
          });
        }
        return _db.rulesQueue;
      },
      "size": function() {
        return _db.rulesQueue.length;
      }
    },
    "file": {
      /*
            ## db.queue.file{} ##
            these methods affect the file queue, used for tracking pending callbacks
            when a file is being downloaded. It supports a clear() method to remove
            all pending callbacks after the queue has been ran.
      */

      "add": function(moduleId, item) {
        if (!_db.fileQueue[moduleId]) {
          !(_db.fileQueue[moduleId] = []);
        }
        return _db.fileQueue[moduleId].push(item);
      },
      "get": function(moduleId) {
        if (_db.fileQueue[moduleId]) {
          return _db.fileQueue[moduleId];
        } else {
          return [];
        }
      },
      "clear": function(moduleId) {
        if (_db.fileQueue[moduleId]) {
          return _db.fileQueue[moduleId] = [];
        }
      }
    },
    "amd": {
      /*
            ## db.queue.amd{} ##
            these methods affect the amd queue, used for tracking pending amd callbacks
            when a defined module file is being downloaded. It supports a clear() method to remove
            all pending callbacks after the queue has been ran.
      */

      "add": function(moduleId, item) {
        if (!_db.amdQueue[moduleId]) {
          !(_db.amdQueue[moduleId] = []);
        }
        return _db.amdQueue[moduleId].push(item);
      },
      "get": function(moduleId) {
        if (_db.amdQueue[moduleId]) {
          return _db.amdQueue[moduleId];
        } else {
          return [];
        }
      },
      "clear": function(moduleId) {
        if (_db.amdQueue[moduleId]) {
          return _db.amdQueue[moduleId] = [];
        }
      }
    },
    "define": {
      "add": function(moduleId) {
        return _db.defineQueue.unshift(moduleId);
      },
      "remove": function() {
        return _db.defineQueue.shift();
      },
      "peek": function() {
        return _db.defineQueue[0];
      }
    }
  }
};