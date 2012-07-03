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

var Require = Class.extend(function() {
  return {
    init: function(path, module, exports) {
      this.path = path;
      this.module = module;
      this.exports = exports;
    },
    require: function(moduleId, callback) {
      var path = null;
      if (typeof(moduleId) === "string") {
        path = Analyzer.toUrl(moduleId, this.path);
        module = Executor.getModule(path);
        if (!module) {
          throw new Error("module "+moduleId+" not found at "+path);
        }
        return module.exports;
      }

      // AMD require
      var strippedModules = Analyzer.stripBuiltins(moduleId);
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
      var root = new TreeNode();
      var tn;
      var callsRemaining = moduleList.length;

      root.setPath(path || userConfig.moduleRoot);

      // for each module, spawn a download. On download, spawn an execution
      // when all executions have ran, fire the callback with the local require
      // scope
      for (var i = 0, len = moduleList.length; i < len; i++) {
        var tn = new TreeNode(moduleList[i]);
        var td = new TreeDownloader(tn);
        td.get(proxy(function(root) {
          Executor.runTree(root, proxy(function() {
            // test if all modules are done
            if (--callsRemaining === 0) {
              callback(this.require)
            }
          }, this));
        }, this);
      }
    }
  };
});