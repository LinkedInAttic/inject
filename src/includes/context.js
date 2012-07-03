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
context.Inject = {
  INTERNAL: {
    defineAs: function() {},
    undefineAs: function() {},
    createModule: function() {},
    setModuleExports: function() {},
    require: Inject.require,
    define: Inject.define,
    execute: {}
  },
  easyXDM: easyXDM,
  reset: function() {},
  enableDebug: function() {},
  toUrl: function() {},
  setModuleRoot: function() {},
  setExpires: function() {},
  setCrossDomain: function() {},
  clearCache: function() {},
  manifest: function() {},
  addRule: function() {},
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