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

var Inject;
(function() {
  var AsStatic = Class.extend(function() {
    return {
      init: function() {},
      createRequire: function(path) {
        // creates a local require function for the given path
        var require;
        require = function(moduleIdOrList, callback) {
          if (typeof(moduleIdOrList) === "string") {
            Flow()
            .seq(function(next, errors, results) {
              next(null, RulesEngine.resolve(moduleId, path).path);
            })
            .seq(function(next, errors, results) {
              next(null, Executor.getExports(results))
            })
            .seq(function(next, errors, results) {
              var module = results;
              if (!module) {
                throw new Error("module ID "+moduleId+" not found");
              }
              return module;
            });
          }
          else {
            // modules are a list, this is the AMD interface
              // strip the builtins from the module list
              // this.ensure(striplist, callback)
                // on callback
                // loop through list of modules, push require(module) or builtin
                // call callback with new args collection
          }
        };
        require.ensure = function(moduleList, callback) {
          // download all modules
          var flow = Flow();
          var moduleId;
          var moduleUrl;

          function createNode(id) {
            var tn = new TreeNode(id);
            return tn;
          }

          // download all top level items
          for (var i = 0, len = moduleList.length; i < len; i++) {
            flow.par(function(next) {
              var node = createNode(moduleList[i]);
              var td = new TreeDownloader(node);
              td.get(next);
            });
          }

          // for each tree, get the file
          flow.seq(function(next, errors, trees) {
            for (var i = 0, len = trees.length; i < len; i++) {
              trees[i].postOrder(function(item) {
                Communicator.
              })
            }
            callback(require);
          });
        };
      },
      require: function(moduleIdOrList, callback) {
        // if moduleId is string, this is standard require
          // resolve moduleId toURL
          // ask executor for resolved path
            // yes
              // return module at path
            // no
              // throw error

      },
      ensure: function(moduleList, callback) {
        // this is the easiest flow. Take the list of modules,
        // pump straight into the Downloader
        var flow = Flow()
        for (var i = 0, len = moduleList.length; i < len; i++) {
          flow.par(function(next) {
            var path = 
            var td = new TreeDownloader()
          });
        }
      },
      run: function(moduleId) {
        // straight into this.ensure with an empty callback
        this.ensure([moduleId], function() {});
      },
      define: function() {
        var args = Array.prototype.slice(arguments, 0);
        // id, dependencies, executionFunctionOrLiteral
        // dependencies, executionFunctionOrLiteral
        // executionFunctionOrLiteral
        // if there are no dependencies, default to: ["require", "exports", "module"]
        // collect the requires from the fn.toString & add in the dependencies, skipping builtins
        // require.ensure that module list with a callback
          // on callback
          // invoke the local function w/ proper dependency list
      },
      setModuleRoot: function(root) {
        userConfig.moduleRoot = root;
      },
      setCrossDomain: function(crossDomainConfig) {
        userConfig.xd.relayFile = crossDomainConfig.relayFile || null;
        userConfig.xd.relaySwf = crossDomainConfig.relaySwf || null;
      },
      clearCache: function() {},
      setExpires: function(seconds) {
        userConfig.fileExpires = seconds || 0;
      },
      reset: function() { /* TODO: do we need this? */ },
      clearFileRegistry: function() { /* TODO: do we need this? */ },
      addRule: function() {
        // passthrough
        Analyzer.addRule.apply(Analyzer, arguments);
      },
      manifest: function() {
        // passthrough
        Analyzer.manifest.apply(Analyzer, arguments);
      }
    };
  });
  Inject = new AsStatic();
})();
