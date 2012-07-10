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

// assign things to the global context
// export the interface publicly
// most of these should pass through to their proper objects
var globalRequire = new RequireContext();
context.Inject = {
  INTERNAL: {
    defineAs: function() {},
    undefineAs: function() {},
    createModule: function() {},
    setModuleExports: function() {},
    execute: {},
    globalRequire: globalRequire,
    createRequire: function(path) {
      return new RequireContext(path);
    }
  },
  easyXDM: easyXDM,
  reset: function() {},
  enableDebug: function() {
    Inject.enableDebug.apply(this, arguments);
  },
  toUrl: function() {
    RulesEngine.toUrl.apply(this, arguments);
  },
  setModuleRoot: function() {
    Inject.setModuleRoot.apply(this, arguments);
  },
  setExpires: function() {
    Inject.setExpires.apply(this, arguments);
  },
  setCrossDomain: function() {
    Inject.setCrossDomain.apply(this, arguments);
  },
  clearCache: function() {},
  manifest: function() {
    Analyzer.manifest.apply(Analyzer, arguments);
  },
  addRule: function() {
    Analyzer.addRule.apply(Analyzer, arguments);
  },
  require: globalRequire.require,
  ensure: globalRequire.ensure,
  run: globalRequire.run,
  define: globalRequire.define,
  version: INJECT_VERSION
};

// commonJS
context.require = Inject.require;
context.require.ensure = Inject.ensure;
context.require.run = Inject.run;

// AMD
context.define = Inject.define;
context.define.amd = true;
context.require.toUrl = Analyzer.toUrl;