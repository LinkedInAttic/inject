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
/**
 * This file defines the public interface for Inject
 * many functions in this collection pass through via proxy
 * to internal methods
 * @file public interface for Inject
 */
var globalRequire = new RequireContext();

context.Inject = {
  INTERNAL: {
    defineExecutingModuleAs: proxy(Executor.defineExecutingModuleAs, Executor),
    undefineExecutingModule: proxy(Executor.undefineExecutingModule, Executor),
    createModule: proxy(Executor.createModule, Executor),
    setModuleExports: function() {},
    execute: {},
    globalRequire: globalRequire,
    createRequire: proxy(InjectCore.createRequire, InjectCore),
    createDefine: proxy(InjectCore.createDefine, InjectCore)
  },
  easyXDM: easyXDM,
  reset: function() {
    InjectCore.reset();
  },
  enableDebug: function() {
    InjectCore.enableDebug.apply(this, arguments);
  },
  toUrl: function() {
    RulesEngine.toUrl.apply(this, arguments);
  },
  setModuleRoot: function() {
    InjectCore.setModuleRoot.apply(this, arguments);
  },
  setExpires: function() {
    InjectCore.setExpires.apply(this, arguments);
  },
  setCacheKey: function() {
    InjectCore.setCacheKey.apply(this, arguments);
  },
  setCrossDomain: function() {
    InjectCore.setCrossDomain.apply(this, arguments);
  },
  clearCache: function() {
    InjectCore.clearCache();
  },
  manifest: function() {
    RulesEngine.manifest.apply(RulesEngine, arguments);
  },
  addRule: function() {
    RulesEngine.addRule.apply(RulesEngine, arguments);
  },
  require: InjectCore.createRequire(),
  define: InjectCore.createDefine(),
  version: INJECT_VERSION
};

// commonJS (and AMD's toUrl)
context.require = context.Inject.INTERNAL.createRequire();

// AMD
context.define = context.Inject.INTERNAL.createDefine();