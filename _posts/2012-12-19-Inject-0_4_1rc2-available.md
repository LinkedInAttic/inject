---
layout: news
title: Inject 0.4.1rc2 available
category: news
author: jheuser
---

Get this release over at the [downloads](/download) page

##Changes since RC1
Relative paths do not resolve to correct absolute paths beyond immediate peer

##Full Changelog

###New Features

* Introduces the afterFetch pointcut, allowing for mutation of a file before it is executed. This collapses the before/after pointcuts under one umbrella.
* AMD and Inject Plugins: We can now load plugins with a plugin! prefix, where "plugin" is a supported plugin. We're launching with text, json, and css. We also support AMD loader plugins
* Massive push for end-user documentation: The gh-pages branch (soon to be www.injectjs.com)

###Bug Fixes

* \#176 test for line offset is relegated to just Firefox (remove unneeded fake-error utility)
* \#177 improved detection of dependencies
* \#194 addRule regex fixes for Chrome 12

###Dev Features

* AMD tests are now external to the repository to ensure maximum compliance
* CJS tests are now external to the repository to ensure maximum compliance
* link.js used for AST integration
* added a simple flow control library to allow us to create an asynchronous queue (For things like the afterFetch pointcuts)