---
layout: download
title : Migrating to 0.4.0
---

## From 0.3.x
**Renamed APIs** the following APIs have been moved to a new location. Search/Replace can catch instances in your code.

* require.clearCache() => Inject.clearCache()
* require.reset() => Inject.reset()
* require.manifest() => Inject.manifest()
* require.addRule() => Inject.addRule()
* require.setExpires() => Inject.setExpires()
* require.setCrossDomain() => Inject.setCrossDomain()  
  **this method also has changes (see below)**
* require.setModuleRoot() => Inject.setModuleRoot()  
  **this method also has changes (see below)**
* Inject.defineAs() => Inject.INTERNAL.defineExecutingModuleAs()  
  This was always intended as an internal method that needed to be reachable from the eval() scope
* Inject.undefineAs() => Inject.INTERNAL.undefineExecutingModule()  
  This was always intended as an internal method that needed to be reachable from the eval() scope
* Inject.createModule() => Inject.INTERNAL.createModule()
  This was always intended as an internal method that needed to be reachable from the eval() scope
* Inject.setModuleExports() => Inject.INTERNAL.setModuleExports()
  This was always intended as an internal method that needed to be reachable from the eval() scope

**APIs with Changes** the following APIs have been changed. Notes for integration are included.

* require.clearCache() => Inject.clearCache()  
  This no longer takes a parameter, and simply clears the localStorage cache for Inject
* require.setModuleRoot() => Inject.setModuleRoot()  
  setModuleRoot() now requires an ending slash
* require.setCrossDomain() => Inject.setCrossDomain()
  The object passed in to Inject.setCrossDomain will contain two attributes `realyHtml` (hasn't changed) and `relaySwf` (new). The addition of easyXDM requires you specify a SWF file location. We recommend putting the SWF file alongside the HTML file. Additionally, the `relay.html` file will need to be updated.

**Additional Changes** you will also need to make the following changes as part of this migration

* update `relay,.html` file to new version (cross domain only)  
  Inside of `relay.html` there is a new directive `ALLOWED_DOMAIN` which you can set to the domain running inject. This will take advantage of easyXDM's added security.
* upload new `relay.swf` to a location accessible to both domains (cross domain only)
* Module paths for `require()` which were depending on relative information to be based on path will need to be updated. The proper implementation requires relative information to be based on the module's ID at invocation, not its path at resolution. This change should only affect people depending on `addRule()` in combination with relative requires.