<a name="v0.7.0-rc1"></a>
### v0.7.0-rc1 (2014-02-28)


#### Bug Fixes

* **Communicator:** communicator now only uses iframe when cross domain ([3907e556](http://github.com/jakobo/atomic/commit/3907e556d1b27222426a55026bd33d786140bf97))
* **grunt:**
  * use native trim ([1aa45f7b](http://github.com/jakobo/atomic/commit/1aa45f7bb09541ea55023e99769d649743e6630a))
  * Reincludes the qunit commands ([8dd5dd4e](http://github.com/jakobo/atomic/commit/8dd5dd4e838ca3e256c2cccd8a249b760a2e0d72))


#### Features

* **Core:** Allows for multiple instances of Inject ([4ee4af1d](http://github.com/jakobo/atomic/commit/4ee4af1d6248990fb6a88e6e74da88b0f52d7754))
* **grunt:** adds a release task check to ensure the branch is master ([d568538a](http://github.com/jakobo/atomic/commit/d568538a3414f10fe5144ba799893d6437f27c9b))


#### Breaking Changes

* If you had logic that was depending on the iframe existing, then it may not
always be available. Making a cross domain request will establish the iframe.
 ([3907e556](http://github.com/jakobo/atomic/commit/3907e556d1b27222426a55026bd33d786140bf97))

<a name="v0.6.1"></a>
### v0.6.1 (2014-01-31)

#### Bug Fixes
* **Communicator, Relay:** repairs broken event listener calls ([951d087e](http://github.com/linkedin/inject/commit/951d087e9755e12520ae4e478d0ab8a16b522d6f))

<a name="v0.6.0"></a>
## v0.6.0 (2014-01-07)


#### Bug Fixes

* **RulesEngine:** Adds support for calling define() with no base URL ([99ff467b](http://github.com/linkedin/inject/commit/99ff467bf67462a6cfe787a56ac97821597057b1))

<a name="v0.6.0-rc2"></a>
### v0.6.0-rc2 (2014-01-03)


#### Bug Fixes

* **RulesEngine:** Adds support for calling define() with no base URL ([99ff467b](http://github.com/linkedin/inject/commit/99ff467bf67462a6cfe787a56ac97821597057b1))

<a name="v0.6.0-rc1"></a>
### v0.6.0-rc1 (2013-12-02)

#### Breaking Changes
* easyXDM has been removed from the Inject builds as of 0.6.0. As a result, IE7 requires the external inclusion of easyXDM as a Fetch Rule in order to function. This is done to reduce the total library size for the majority of users. 0.6.0 final will come with instructions for how to bring easyXDM in CORS mode for IE7 support if required.

#### Bug Fixes

* **server.js:** Inject examples now served using /recent ([ce8575ea](http://github.com/linkedin/inject/commit/ce8575ea5a85873bb47f39b9c16eeff65bc8ddf0))
* **Tests, AMD:Plugins** Fixes normalize to use a proper ID ([79568334](http://github.com/linkedin/inject/commit/79568334fc4b0bc12556c143b6ce3d8219d0d442))
* **RequireContext, TreeRunner** Improve handling of inline AMD ([ba85df40](http://github.com/linkedin/inject/commit/ba85df40b78e9dcbe2be54f2d1906114d1eefdc7))

#### Features

* **grunt:**
  * Adds version bumping to release ([8bbbf1a6](http://github.com/linkedin/inject/commit/8bbbf1a6734badee76fe6090177f7d091c902df5))
  * Enables changelog generation support ([15d14fab](http://github.com/linkedin/inject/commit/15d14fab28af44f15dcded6862f8cae56813cdae))
  * adds changelog generation to the grunt environment ([85d99c03](http://github.com/linkedin/inject/commit/85d99c0367c87bfc39f02a17bfabc62a7e9da4cd))
  * Creates grunt release task ([5504b7fa](http://github.com/linkedin/inject/commit/5504b7fa42b08aac02e789f6e8c908007663fdd9))

<a name="v0.5.2"></a>
### 0.5.2 (2013-11-05)

#### Bug Fixes
* **security**: A security issue that affects the inclusion of relay.swf from relay.html has been closed. Users who did not keep their relay.html and relay.swf files in the same directory will need to remediate using the following strategy: the new relay.html file contains a `ALTERNATE_SWF_LOCATION` parameter, which can be used to specify the location of the SWF file. This will need to be done as part of the upgrade of the relay files are in different locations.

<a name="v0.5.1"></a>
### 0.5.1 (2013-10-28)

#### Bug Fixes
* (unreported) Deep nested AMD modules are returning an exports of `{}` instead of their contents

#### Features
* \#284 removed LinkJS and reverted to Regex to improve performance
* \#282 easyXDM Upgraded to latest version
* \#258 Stack traces are improved when JS errors are encounted

<a name="v0.5.0"></a>
## 0.5.0 (2013-08-05)

#### Breaking Changes
* \#246 **pointcuts.before and pointcuts.after are removed:** Instead of using the before/after pointcuts, we encourage the use of the new addRule replacement methods. The afterFetch pointcut is still supported, although addRule itself is now deprecated. We encourage everyone to move to the new addXXRule methods.

#### Bug Fixes
* \#255 setExpires(0) was treated as "always cache" instead of "never cache"
* \#256 CSS plugin attaches properly in IE7

#### New Features
* \#254 **new rules to replace addRule:** addModuleRule, addFileRule, addContentRule, addFetchRule, addPackage. This collection of rules gives the developer much greater control of the loading system, allowing any or many parts of the module loader to be circumvented. Additionally, packages can be regstered globally using addPackage.
* \#244 **run Inject alongside script tags:** Unlike traditional AMD loaders, you are able to run Inject alongside code that checks for define and define.amd. A new method Inject.setGlobalAMD(false) allows the global define.amd to be disabled. The define.amd variable will still be available within the sandbox context. This is an incredibly useful feature if you have both script tags and Inject on your page.
* \#217 **remote localStorage:** to improve security, when using a CDN, the remote localStorage location will be used as opposed to the primary hosting domain. This frees up the main URLs localStorage for other storage operations.
* \#213 Bower Support available as the package "inject"
* \#254 addRule is now deprecated
* \#248 "grunt release" available for creating the release .tgz file

<a name="v0.4.2"></a>
### 0.4.2 (2013-03-27)

#### Bug Fixes
* \#245 protect against getCurrentAMD returning null
* \#216 fixed issues with parsing more complex JS

#### Features
* \#239 Using new AMD testing infrastructure
* \#219 Removed random Travis-CI failures
* \# Link.JS upgrade
* \# easyXDM upgrade
* \# upgraded from Class.js to Fiber.js

<a name="v0.4.1"></a>
### 0.4.1 (2013-01-04)

#### Bug Fixes
* \#176 test for line offset is relegated to just Firefox (remove unneeded fake-error utility)
* \#177 improved detection of dependencies
* \#194 addRule regex fixes for Chrome 12
* \#196 Relative paths do not resolve to correct absolute paths beyond immediate peer

#### Features
* Introduces the afterFetch pointcut, allowing for mutation of a file before it is executed. This collapses the before/after pointcuts under one umbrella.
* AMD and Inject Plugins: We can now load plugins with a `plugin!` prefix, where "plugin" is a supported plugin. We're launching with text, json, and css. We also support AMD loader plugins
* Massive push for end-user documentation: The gh-pages branch (soon to be www.injectjs.com)
* AMD tests are now external to the repository to ensure maximum compliance
* CJS tests are now external to the repository to ensure maximum compliance
* link.js used for AST integration
* added a simple flow control library to allow us to create an asynchronous queue (For things like the afterFetch pointcuts)

<a name="v0.4.0"></a>
## 0.4.0 (2013-10-26)

#### Breaking Changes
* The new Cross Domain library (easyXDM) requires a new configuration
* Public API Cleanup

#### Bug Fixes
* \#171 Query string problems in relative URLs  
* \#170 setModuleRoot and IE9 compatibility  
* \#164 IE Compatibility w/ Executor  

#### Features
* Inject.setUseSuffix available for toggling automatic suffix appending
* setCacheKey now allows you to upgrade files and not run into localStorage conflicts
* JSDoc implemented as our standard commenting format (and now it's all commented)
* Pure JavaScript Release (no CoffeeScript)
* New Build System (node makefile.js)
* Change of internal library from Porthole to EasyXDM
* Change from Google Closure to UglifyJS

<a name="v0.3.1"></a>
### 0.3.1 (2012-07-01)

#### Bug Fixes
* \#133 Minified asset had syntax error due to compression  

<a name="v0.3.0"></a>
## 0.3.0 (2013-06-13)

#### Breaking Changes
* jQuery automatic AMD support removed

#### Bug Fixes
* \#124 Resolution of debugging sourceURLs issues introduced in 0.2.4
* \#116 applyRules (Rules Engine) now lets adjusted rules continue through the stack
* \#118 requiring a file via different module paths misses cache  
* \#117 require.ensure mandates the first parameter is an array  
* \#115 require.clearCache fixes  

#### Features
* lscache upgraded to latest version

<a name="v0.2.4"></a>
### 0.2.4 (2012-04-11)

#### Bug Fixes
* \#92 Syntax Errors in Minified Source  
* \#91 setExports needs to accept a function  
* \#86 Relative module IDs resolve properly (compliance w/ AMD)  
* \#82 Require.manifest handles string values properly  

<a name="v0.2.3"></a>
### 0.2.3 (2011-12-13)

#### Bug Fixes
* \#78 AMD Circular Test passes  
* \#71 Executor properly returning line numbers on errors  
* \#69 Improvements in localStorage Shim  

#### Features
* AMD Compliance (100%)
* Modules 1.1.1 Compliance
* Official release of the IE 6/7 Shim
* CJS Modules 1.0, 1.1, 1.1.1 tests

<a name="v0.2.2"></a>
### 0.2.2 (2011-12-06)

#### Bug Fixes
* \#59 require() in comments no longer bring picked up  
* \#57 requiring with cache hits is storing the full module contents  
* \#56 overlapping dependencies with require.ensure only invoked once  
* \#33 Improved dependency extraction  

#### Features
* define() globally available
* Improvements to Paperboy for static content
* New command line options to build IE7 support and easyXDM support

<a name="v0.2.1"></a>
### 0.2.1 (2011-11-21)

#### Features
* module.setExports() support
* Asynchronous Module Definition (AMD) support
* lscache supports an LRU

<a name="v0.2.0"></a>
## 0.2.0 (2011-11-15)

#### Breaking Changes
* Externalization of JSON Shim - the new JSON shim is in an external file

#### Bug Fixes
* \#3 Resolution of localStorage limit  
* \#2 "this" scoped to module object 

#### Features
* Released under Apache Software License 2.0
* Pointcuts - the ability to inject custom code that runs before and after a given module. Enables support of non CJS modules
* localStorage expiration - a file can now be requested to expire out of localStorage after a specified number of seconds
