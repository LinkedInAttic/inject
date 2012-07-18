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

var RequireContext = Class.extend(function() {
  return {
    init: function(path) {
      this.path = path || null;
    },
    log: function(message) {
      debugLog("RequireContext for "+this.path, message);
    },
    getPath: function() {
      if (!userConfig.moduleRoot) {
        throw new Error("moduleRoot must be defined. Please use Inject.setModuleRoot()");
      }
      return this.path || userConfig.moduleRoot;
    },
    getModule: function(moduleId) {
      var modulePath = RulesEngine.resolve(moduleId, this.getPath()).path;
      return Executor.getModule(modulePath).exports;
    },
    getAllModules: function(moduleIdOrList, require, module) {
      var args = [];
      var mId = null;
      for (var i = 0, len = moduleIdOrList.length; i < len; i++) {
        mId = moduleIdOrList[i];
        switch(mId) {
          case "require":
            args.push(require);
            break;
          case "module":
            args.push(module);
            break;
          case "exports":
            args.push(module.exports);
            break;
          default:
            // push the resolved item onto the stack direct from executor
            args.push(this.getModule(mId));
        }
      }
      return args;
    },
    require: function(moduleIdOrList, callback) {
      var path;
      var module;

      if (typeof(moduleIdOrList) === "string") {
        this.log("CommonJS require(string) of "+moduleIdOrList);
        if (/^[\d]+$/.test(moduleIdOrList)) {
          throw new Error("require() must be a string containing a-z, slash(/), dash(-), and dots(.)");
        }

        path = RulesEngine.resolve(moduleIdOrList, this.getPath()).path;
        module = Executor.getModule(path);

        if (!module) {
          throw new Error("module "+moduleIdOrList+" not found at "+path);
        }
        return module.exports;
      }

      // AMD require
      this.log("AMD require(Array) of "+moduleIdOrList.join(", "));
      var strippedModules = Analyzer.stripBuiltins(moduleIdOrList);
      this.ensure(strippedModules, proxy(function(localRequire) {
        var modules = this.getAllModules(moduleIdOrList, localRequire);
        callback.apply(context, modules);
      }, this));
    },
    ensure: function(moduleList, callback) {
      if (Object.prototype.toString.call(moduleList) !== '[object Array]') {
        throw new Error("require.ensure() must take an Array as the first argument");
      }

      this.log("CommonJS require.ensure(array) of "+moduleList.join(", "));

      // strip builtins (CommonJS doesn't download or make these available)
      moduleList = Analyzer.stripBuiltins(moduleList);

      var tn;
      var td;
      var callsRemaining = moduleList.length;
      var thisPath = (this.getPath()) ? this.getPath() : userConfig.moduleRoot;

      // exit early when we have no builtins left
      if (!callsRemaining) {
        if (callback) {
          callback(proxy(this.require, this));
        }
        return;
      }

      // for each module, spawn a download. On download, spawn an execution
      // when all executions have ran, fire the callback with the local require
      // scope
      for (var i = 0, len = moduleList.length; i < len; i++) {
        tn = TreeDownloader.createNode(moduleList[i], thisPath);
        td = new TreeDownloader(tn);
        // get the tree, then run the tree, then --count
        // if count is 0, callback
        td.get(proxy(function(root, files) {
          Executor.runTree(root, files, proxy(function() {
            // test if all modules are done
            if (--callsRemaining === 0) {
              if (callback) {
                callback(proxy(this.require, this));
              }
            }
          }, this));
        }, this));
      }
    },
    run: function(moduleId) {
      this.log("AMD require.run(string) of "+moduleId);
      this.ensure([moduleId]);
    },
    define: function() {
      var args = Array.prototype.slice.call(arguments, 0);
      var id = null;
      var dependencies = ["require", "exports", "module"];
      var executionFunctionOrLiteral = {};
      var nonCircularDependencies = [];
      var tempModule = null;
      var tempModulePath = null;

      // these are the various AMD interfaces and what they map to
      // we loop through the args by type and map them down into values
      // while not efficient, it makes this overloaed interface easier to
      // maintain
      var interfaces = {
        "string array object": ["id", "dependencies", "executionFunctionOrLiteral"],
        "string object":       ["id", "executionFunctionOrLiteral"],
        "array object":        ["dependencies", "executionFunctionOrLiteral"],
        "object":              ["executionFunctionOrLiteral"]
      };
      var key = [];
      var value;
      for (var i = 0, len = args.length; i < len; i++) {
        if (Object.prototype.toString.apply(args[i]) === '[object Array]') {
          key.push("array");
        }
        else if (typeof(args[i]) === "object" || typeof(args[i]) === "function") {
          key.push("object");
        }
        else {
          key.push(typeof(args[i]));
        }
      }
      key = key.join(" ");

      if (!interfaces[key]) {
        throw new Error("You did not use an AMD compliant interface. Please check your define() calls");
      }

      key = interfaces[key];
      for (var i = 0, len = key.length; i < len; i++) {
        value = args[i];
        switch(key[i]) {
          case "id":
            id = value;
            break;
          case "dependencies":
            dependencies = value;
            break;
          case "executionFunctionOrLiteral":
            executionFunctionOrLiteral = value;
            break;
        }
      }

      this.log("AMD define(...) of "+ ((id) ? id : "anonymous"));

      // handle anonymous modules
      if (!id) {
        id = Executor.getCurrentExecutingModuleName();
        this.log("AMD identified module as "+id);
      }

      // take care of define()ing only once
      tempModulePath = RulesEngine.resolve(id, this.getPath()).path;
      if (Executor.isModuleDefined(tempModulePath)) {
        this.log("AMD module at url "+tempModulePath+" has already ran once");
        return;
      }
      Executor.flagModuleAsDefined(tempModulePath);

      if (typeof(executionFunctionOrLiteral) === "function") {
        dependencies.concat(Analyzer.extractRequires(executionFunctionOrLiteral.toString()));
      }

      this.log("AMD define(...) of "+id+" depends on: "+dependencies.join(", "));

      // strip any circular dependencies that exist
      // this will prematurely create modules
      for (var i = 0, len = dependencies.length; i < len; i++) {
        if (BUILTINS[dependencies[i]]) {
          // was a builtin, skip
          continue;
        }
        tempModulePath = RulesEngine.resolve(dependencies[i], this.getPath()).path;
        if (!Executor.isModuleCircular(tempModulePath)) {
          nonCircularDependencies.push(dependencies[i]);
        }
      }

      this.log("AMD define(...) of "+id+" will retrieve on: "+nonCircularDependencies.join(", "));

      // ask only for the missed items + a require
      nonCircularDependencies.unshift("require");
      this.require(nonCircularDependencies, proxy(function(require) {
        // use require as our first arg
        var module = Executor.getModule(this.getPath());
        var resolvedDependencies = this.getAllModules(dependencies, require, module);
        var results;

        // if the executor is a function, run it
        // if it is an object literal, walk it.
        if (typeof(executionFunctionOrLiteral) === "function") {
          results = executionFunctionOrLiteral.apply(null, resolvedDependencies);
          if (results) {
            module.setExports(results);
          }
        }
        else {
          for (name in executionFunctionOrLiteral) {
            module.exports[name] = executionFunctionOrLiteral[name];
          }
        }

      }, this));
    }
  };
});
