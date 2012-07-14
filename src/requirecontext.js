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
    getPath: function() {
      if (!userConfig.moduleRoot) {
        throw new Error("moduleRoot must be defined. Please use Inject.setModuleRoot()");
      }
      return this.path || userConfig.moduleRoot;
    },
    require: function(moduleIdOrList, callback) {
      var path;
      var module;
      if (typeof(moduleIdOrList) === "string") {
        path = RulesEngine.resolve(moduleIdOrList, this.getPath()).path;
        module = Executor.getModule(path);
        if (!module) {
          throw new Error("module "+moduleIdOrList+" not found at "+path);
        }
        return module.exports;
      }

      // AMD require
      var strippedModules = Analyzer.stripBuiltins(moduleIdOrList);
      this.ensure(strippedModules, proxy(function(localRequire) {
        var args = [];
        for (mId in strippedModules) {
          switch(mId) {
            case "require":
              args.push(localRequire);
              break;
            case "module":
              args.push(this.module);
              break;
            case "exports":
              args.push(this.exports);
              break;
            default:
              args.push(this.require(mId));
          }
          callback.apply(context, args);
        }
      }, this));
    },
    ensure: function(moduleList, callback) {
      // create our root node
      var root = TreeDownloader.createNode(null, this.getPath() || userConfig.moduleRoot);
      var tn;
      var td;
      var callsRemaining = moduleList.length;

      // for each module, spawn a download. On download, spawn an execution
      // when all executions have ran, fire the callback with the local require
      // scope
      for (var i = 0, len = moduleList.length; i < len; i++) {
        tn = TreeDownloader.createNode(moduleList[i]);
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
      this.ensure([moduleId]);
    },
    define: function() {
      var args = Array.prototype.slice(arguments, 0);
      var id = args[0];
      var dependencies = args[1];
      var executionFunctionOrLiteral = args[2];
      if (!executionFunctionOrLiteral) {
        executionFunctionOrLiteral = dependencies;
        dependencies = id;
        id = null;
      }
      if (!executionFunctionOrLiteral) {
        executionFunctionOrLiteral = dependencies;
        dependencies = ["require", "exports", "module"];
      }
      if (!executionFunctionOrLiteral) {
        throw new Error("You must provide at least 1 argument to define");
      }

      if (typeof(executionFunctionOrLiteral) === "function") {
        dependencies.concat(Analyzer.extractRequires(executionFunctionOrLiteral.toString()));
      }

      this.ensure(dependencies, function() {
        var require = new RequireContext(path);
        var module;
        var results;

        if (typeof(executionFunctionOrLiteral) === "function") {
          module = Executor.createModule(id);
          results = executionFunctionOrLiteral(require.require, require.module.exports, require.module);
          Executor.storeModule(id, module);
        }
        else {
          module = Executor.createModule(id);
          for (name in executionFunctionOrLiteral) {
            module.exports[name] = executionFunctionOrLiteral[name];
            Executor.storeModule(id, module);
          }
        }
      });
    },
  };
});
