---
layout: news
title: Accouncing Inject 0.4.2
category: news
author: mpowell
published: false
---

Get this release over at the [downloads](/download) page

##Overview
0.4.2 is a library upgrade and bug fix release. This release improves stability, performance, and security. It also includes updates to the build system and testing infrastructure.

##New Features
* No new features

##Dev Changes
* Inject was converted to [Grunt.js](http://gruntjs.com/) for build tasks. The new system doesn't rely on a custom makefile or tasks anymore. The [build-from-source](http://www.injectjs.com/docs/0.4.x/howto/build_from_source.html) how-to was updated with the latest instructions.
* The AMD JS Tests are now converted to a system similar to the CommonJS compliance tests. This reduces total test execution time, and allows all tests to be ran in a single framework.
* Travis-CI runs are more stable as a result of the conversion to Grunt and the new AMD tests.

##Tickets From This Release
* [\#240](https://github.com/linkedin/inject/pull/240) Bug fix for undefined/null return value of Executor.getCurrentExecutingAMD
* [\#245](https://github.com/linkedin/inject/issues/245) undefined/null return value of Executor.getCurrentExecutingAMD
* [\#239](https://github.com/linkedin/inject/pull/239) Convert AMDJS Unit Tests to New Format
* [\#219](https://github.com/linkedin/inject/issues/219) Travis CI Failing in Master for Unknown Reason
* [\#218](https://github.com/linkedin/inject/issues/218) Upgrade Link.JS to Latest Version
* [\#216](https://github.com/linkedin/inject/issues/216) Issues parsing coffee-script.js and xregexp-all.js
* [\#203](https://github.com/linkedin/inject/issues/203) easyXDM Upgrade
* [\#158](https://github.com/linkedin/inject/issues/158) Upgrade Class.js to Fiber.js
