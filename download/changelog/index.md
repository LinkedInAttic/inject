---
layout: download
title : Changelog
---

## 0.4.2 (Released March 27, 2013)
### New Features
n/a

### Bug Fixes
* \#245 protect against getCurrentAMD returning null
* \#216 fixed issues with parsing more complex JS

### Dev Features
* \#239 Using new AMD testing infrastructure
* \#219 Removed random Travis-CI failures
* \# Link.JS upgrade
* \# easyXDM upgrade
* \# upgraded from Class.js to Fiber.js

## 0.4.1 (Released Jan 4, 2013)
### New Features
* Introduces the afterFetch pointcut, allowing for mutation of a file before it is executed. This collapses the before/after pointcuts under one umbrella.
* AMD and Inject Plugins: We can now load plugins with a `plugin!` prefix, where "plugin" is a supported plugin. We're launching with text, json, and css. We also support AMD loader plugins
* Massive push for end-user documentation: The gh-pages branch (soon to be www.injectjs.com)

### Bug Fixes
* \#176 test for line offset is relegated to just Firefox (remove unneeded fake-error utility)
* \#177 improved detection of dependencies
* \#194 addRule regex fixes for Chrome 12
# \#196 Relative paths do not resolve to correct absolute paths beyond immediate peer

### Dev Features
* AMD tests are now external to the repository to ensure maximum compliance
* CJS tests are now external to the repository to ensure maximum compliance
* link.js used for AST integration
* added a simple flow control library to allow us to create an asynchronous queue (For things like the afterFetch pointcuts)

## 0.4.0 (released October 26, 2012)

### Backwards Compatibility Issues
* The new Cross Domain library (easyXDM) requires a new configuration
* Public API Cleanup

### New Features
* Inject.setUseSuffix available for toggling automatic suffix appending
* setCacheKey now allows you to upgrade files and not run into localStorage conflicts

### Bug Fixes
* \#171 Query string problems in relative URLs  
* \#170 setModuleRoot and IE9 compatibility  
* \#164 IE Compatibility w/ Executor  

### Dev Features
* JSDoc implemented as our standard commenting format (and now it's all commented)
* Pure JavaScript Release (no CoffeeScript)
* New Build System (node makefile.js)
* Change of internal library from Porthole to EasyXDM
* Change from Google Closure to UglifyJS

## 0.3.1 (released July 01, 2012)

### Bug Fixes
* \#133 Minified asset had syntax error due to compression  

## 0.3.0 (released June 13, 2012)

### Breaks Backwards Compatibility
* jQuery automatic AMD support removed

### Bug Fixes
* \#124 Resolution of debugging sourceURLs issues introduced in 0.2.4
* \#116 applyRules (Rules Engine) now lets adjusted rules continue through the stack
* \#118 requiring a file via different module paths misses cache  
* \#117 require.ensure mandates the first parameter is an array  
* \#115 require.clearCache fixes  

### Dev Features
* lscache upgraded to latest version

## 0.2.4 (released April 11, 2012)

### Bug Fixes
* \#92 Syntax Errors in Minified Source  
* \#91 setExports needs to accept a function  
* \#86 Relative module IDs resolve properly (compliance w/ AMD)  
* \#82 Require.manifest handles string values properly  

## 0.2.3 (released December 13, 2011)

### New Features
* AMD Compliance (100%)
* Modules 1.1.1 Compliance
* Official release of the IE 6/7 Shim

### Bug Fixes
* \#78 AMD Circular Test passes  
* \#71 Executor properly returning line numbers on errors  
* \#69 Improvements in localStorage Shim  

### Dev Features
* CJS Modules 1.0, 1.1, 1.1.1 tests

## 0.2.2 (released December 06, 2011)

### New Features
* define() globally available

### Bug Fixes
* \#59 require() in comments no longer bring picked up  
* \#57 requiring with cache hits is storing the full module contents  
* \#56 overlapping dependencies with require.ensure only invoked once  
* \#33 Improved dependency extraction  

### Dev Fixes
* Improvements to Paperboy for static content
* New command line options to build IE7 support and easyXDM support

## 0.2.1 (released Nov 21, 2011)

### New Features
* module.setExports() support
* Asynchronous Module Definition (AMD) support
* lscache supports an LRU

## 0.2.0 (released Nov 15, 2011)

### High Level Changes
* Released under Apache Software License 2.0

### Breaks Backwards Compatibility
* Externalization of JSON Shim - the new JSON shim is in an external file

### New Features
* Pointcuts - the ability to inject custom code that runs before and after a given module. Enables support of non CJS modules
* localStorage expiration - a file can now be requested to expire out of localStorage after a specified number of seconds

### Bug Fixes
* \#3 Resolution of localStorage limit  
* \#2 "this" scoped to module object  