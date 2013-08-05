---
layout: news
title: Accouncing Inject 0.5.0
category: news
author: fsimeon
---

Get this release over at the [downloads](/download) page

## Overview
0.5.0 contains some backwards incompatible changes. Please see the **compatibility** section below.  0.5.0 enables Bower support, fixes common configuration issues as reported by users, and supports a mixing `script` tags with AMD, which is common in large sites that are attempting to long-transition to an AMD system.

## New Features
**Introducing the addX Suite**: The original `addRule()` has grown organically over time, and reached a point where it was overloaded and performing too many functions. We've divided addRule up into several new methods

* `addContentRule`: Replaces the `afterFetch` pointcut previously used
* `addFetchRule`: Provides module level control of how content is downloaded. This enables alternate download methods should Inject's XHR methods not be sufficient
* `addFileRule`: Replaces the `path` property used in addRule. Used to translate a moduleID into a URL.
* `addModuleRule`: Change how a module's ID is resolved. Often used to change where a "global" module such as jquery may be located
* `addPackage`: Allows you to globally alias a module. This allows you to define "global" modules, even though their installed location is different.

**Bower** Inject is now listed on Bower: http://sindresorhus.com/bower-components/#!/search/injectjs

## Dev Changes
**security** When using Inject's Cross-Domain setup, localStorage is now used on the remote side as opposed to the local side. When using a CDN, this greatly improves security by not putting your javascript on the same domain as user generated content.

**defaults** The default cache life is now 0, meaning no cache is used unless explicitly set

##Bug Fixes
* CommonJS Scan does not occur if dependencies are set

## Tickets From This Release
* [\#213](https://github.com/linkedin/inject/pull/#213) Component JSON for Bower
* [\#217](https://github.com/linkedin/inject/pull/#217) Remote localStorage Cache
* [\#226](https://github.com/linkedin/inject/pull/#226) Default cache life is now 0
* [\#234](https://github.com/linkedin/inject/pull/#234) CommonJS Scan does not occur if dependencies are set
* [\#238](https://github.com/linkedin/inject/pull/#238) dividing addRule into multiple methods
* [\#244](https://github.com/linkedin/inject/pull/#244) Inject config to disable global AMD
* [\#246](https://github.com/linkedin/inject/pull/#246) Removal of before/after pointcuts
* [\#248](https://github.com/linkedin/inject/pull/#248) grunt "release" task to make tar+gzip
* [\#256](https://github.com/linkedin/inject/pull/#256) Fix css Plugin in IE7
