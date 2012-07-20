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

var sandbox;
module("src :: Executor", {
  setup: function() {
    sandbox = new Sandbox(true);
    console.log("Executor should throw 1 error per module due to the env syntax check");
    loadDependencies(sandbox, [
      "/src/includes/constants.js",
      "/src/includes/globals.js",
      "/src/includes/commonjs.js",
      "/src/lib/class.js",
      "/src/executor.js"
    ], function() {
      sinon.spy(sandbox.global, "eval");
    });
  },
  teardown: function() {
    sandbox = null;
  }
});

test("Scaffolding", function() {
  var context = sandbox.global;
  ok(typeof(context.Executor) === "object", "object exists");
});

test("JS Execution", function() {
  var context = sandbox.global;
  context.userConfig.debug.sourceMap = true;
  var Executor = context.Executor;

  // inject facade
  context.Inject = {
    INTERNAL: {
      execute: {},
      createModule: function() {
        return {
          exports: {}
        };
      },
      createRequire: function() {
        return function() {};
      },
      createDefine: function() {
        return function() {};
      },
      require: function() {},
      defineExecutingModuleAs: function() {},
      undefineExecutingModule: function() {},
      setModuleExports: function() {}
    },
    clearCache: function() {}
  };

  var testScript = "exports.foo = \"bar\";";
  var module = Executor.runModule("testId", testScript, "http://example.com/testid.js", {});
  var moduleB = Executor.runModule("testId", testScript, "http://example.com/testid.js", {});

  equal(module.exports.foo, "bar", "module sandboxed and set exports");
  ok(context.eval.calledOnce, "eval only called once despite loading multiple modules");
  equal(module, moduleB, "same execution yields same module result");
});