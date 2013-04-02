---
layout: news
title: Inject 0.4.1 Available
category: news
author: jheuser
---

Get this release over at the [downloads](/download) page

##Overview
0.4.1 is a feature and bug fix release. All users of Inject running 0.4.0 are encouraged to upgrade.

##New Features
* Introduces the afterFetch pointcut, allowing for mutation of a file before it is executed. This collapses the before/after pointcuts under one umbrella.
* AMD and Inject Plugins: We can now load plugins with a plugin! prefix, where "plugin" is a supported plugin. We're launching with text, json, and css. We also support AMD loader plugins
* Massive push for end-user documentation. Injectjs.com is now live

##Dev Changes
* AMD and CommonJS tests are now external to our repository, reducing the number of tests we need to maintain
* Analyzer.js is running the Link.JS library internally to improve reliability in dependency detection
* JSHint file was added to our codebase to improve consistency in coding style
* Documentation updates and repaired broken examples
* Travis-CI Reliability Improvements

##Tickets From This Release
* [\#201](https://github.com/linkedin/inject/issues/201), [\#98](https://github.com/linkedin/inject/issues/98) Link.js Upgrade
* [\#196](https://github.com/linkedin/inject/issues/196) Relative paths do not resolve to correct absolute paths beyond immediate peer
* [#194](https://github.com/linkedin/inject/issues/194) "applyRules" doesn't match regex rules in old versions of Chrome
* [\#193](https://github.com/linkedin/inject/pull/193), [\#191](https://github.com/linkedin/inject/issues/191), [\#189](https://github.com/linkedin/inject/issues/189), [\#180](https://github.com/linkedin/inject/pull/180) Plugin Support
* [\#190](https://github.com/linkedin/inject/issues/190), [\#90](https://github.com/linkedin/inject/issues/90) afterFetch pointcut
* [\#184](https://github.com/linkedin/inject/issues/184) Change Readme and Wiki Docs to be more end-user friendly
* [#183](https://github.com/linkedin/inject/pull/183) Improved unit testing with jshint integration
* [\#181](https://github.com/linkedin/inject/pull/181) Fixes for #177, define regex
* [\#179](https://github.com/linkedin/inject/pull/179), [\#175](https://github.com/linkedin/inject/pull/175) IE 7/8/9 Test Script for Executor Improvements
* [\#177](https://github.com/linkedin/inject/issues/177) Error parsing arrays in modules
* [\#176](https://github.com/linkedin/inject/issues/176) Chrome 13 Bug with Missing Semicolon
* [\#174](https://github.com/linkedin/inject/issues/174) Error on Examples page
* [\#172](https://github.com/linkedin/inject/issues/172) When resolving to / shortcut, pointcuts are not stored
* [\#165](https://github.com/linkedin/inject/issues/165) Examples for how to concatenate files when using Inject
* [\#163](https://github.com/linkedin/inject/issues/163) A nice and clean way to see exceptions thrown by module files
* [\#157](https://github.com/linkedin/inject/issues/157) Add CommonJS Tests
* [\#146](https://github.com/linkedin/inject/issues/146) Investigate non-fatal Syntax errors in Travis-CI