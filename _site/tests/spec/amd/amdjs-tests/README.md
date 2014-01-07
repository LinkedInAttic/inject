# AMD Tests

[![Travis CI Status](https://secure.travis-ci.org/amdjs/amdjs-tests.png?branch=master)](https://travis-ci.org/amdjs/amdjs-tests/)

A set of Asynchronous Module Definition
[AMD](https://github.com/amdjs/amdjs-api/wiki/AMD) compliance
tests.

1. Built In Test Runner
2. Adding Your Own AMD Framework
3. Adding AMD-JS Tests To Your CI

# Using The Built In Test Runner

The amd-js test suite comes with a node based test runner. Node is available from the [node.js website](http://nodejs.org). A version greater than **0.8.0** is recommended.

Clone this repository into a local directory, install dependencies with the `npm install` command, and start the server:

```sh
node server/server.js
```

You can visit **http://localhost:4000** in your browser and run the tests from there.

# Adding Your Own AMD Framework

An implementation needs to have the following two files in the **impl** directory:

* AMD loader implementation
* configure script

The configure script should define the following global variables:

* **config**: a function that accepts configuration parameters. Similar to the
RequireJS form of require({}).
* **go**: a function that implements the top level, global function that starts
loading of modules. Equivalent to the RequireJS global require([], function(){})
signature.
* **implemented**: an object whose properties are the types of tests that the
loader expects to pass. A list of valid test categories are at the end of this readme.

Please then add your framework to `server/manifest` and add a line to `.travis.yml` to begin auto-testing your code.

# Adding AMD-JS Tests To Your Own Framework

It's possible to run the AMD-JS tests as part of your existing CI system. You need to provide *bridges* between the AMD-JS suite and your unit testing framework of choice. You can do this by either implementing a global `amdJSPrint` object or defining/implementing a global `system` object on which a `print()` method resides.

Here is a rudimentary system that just outputs to the console:

```js
window.amdJSPrint = function (message, type) {
  console.log(message, type);
};
```

* **amdJSPrint(message, type)**: Outputs the results of a reporter assertion. The *type* is one of `pass`, `fail`, `info`, or `done`.

Using the above, this would be the QUnit equivalent. We use the QUnit **stop** and **start** methods to support any asynchronous operations that may be occuring in the test. In the example below, we also proxy our `go` method, allowing us to capture when a require() call begins, and when all callbacks have completed.

```js
// load me after your AMD implementation that provides
// "go", "config", and "implemented"
(function() {
  var oldGo = window.go;
  window.go = function () {
    var newArgs = [].splice.call(arguments, 0);
    var fn = newArgs[newArgs.length - 1];

    // pause qunit test execution until the dependencies
    // are resolved
    stop();
    newArgs[newArgs.length - 1] = function () {
      fn.apply(undefined, arguments);
      start();
    };

    oldGo.apply(window, newArgs);
  };
  window.amdJSPrint = function (message, type) {
    if (type === 'info' || type === 'done') return;
    test(message, function() {
      ok(type === 'pass', message);
    });
  };
})();
```

We recommend mounting this repository as a [git submodule](http://git-scm.com/book/en/Git-Tools-Submodules), at which point you can have your testing framework invoke each individual js test.

If you wish to hook this up directly to Travis-CI, an element is added to the page (*#travis-results*) with a pass/fail string as its contents. A capture of `console.log()` will also output details in the CI runs.

# Test Types

Each test type builds on the other: supporting later test types implies support
for earlier test types.

## Basic AMD Functionality (basic)

**in the basic_* directories (except basic_require)**

Very basic loading of named modules that have dependency arrays.

* Support for define.amd to indicate an AMD loader.
* Named modules.
* Dependency arrays.
* Circular dependency support via the "exports" and "require" dependency.
* Test for the CommonJS "module" dependency.

## The Basic require() Method (require)

**in the basic_require directory**

Basic require() support, in accordance with the [amdjs require API](https://github.com/amdjs/amdjs-api/wiki/require):

* require(String)
* require(Array, Function)
* require.toUrl(String)

## Anonymous Module Support (anon)

**in the anon_* directories**

Similar tests to **basic**, but using anonymous modules.

## CommonJS Compatibility (funcString)

**in the cjs_define directory**

Tests parsing of definition functions via Function.prototype.toString() to
get out dependencies. Used to support simplified CommonJS module wrapping:

```js
  define(function (require) {
    var a = require('a');
    // Return the module definition.
    return {};
  });
```

## CommonJS Compatibility with Named Modules (namedWrap)

**in the cjs_named directory**

Similar to the **funcString** tests, but using named modules.

```javascript
  define('some/module', function (require) {
    var a = require('a');
    //Return the module definition.
    return {};
  });
```

## AMD Loader Plugins (plugins)

**in the plugin_double, plugin_fromtext, plugin_normalize* directories**

Support for loader plugins.

* Calling the same plugin resource twice and getting the same value.
* Testing a plugin that implements normalize().
* Testing a plugin that uses load.fromText().

## Dynamic Plugins (pluginsDynamic)

**in the plugin_dynamic and plugin_dynamic_string* directories**

Support for loader plugins that use dynamic: true to indicate their resources
should not be cached by the loader. Instead the loader should call the plugin's
load() method for each instance of a dependency that can be loaded by the plugin.

## Common Config: Packages

**in the config_packages directory**

Support for the [common config API](https://github.com/amdjs/amdjs-api/wiki/Common-Config) section on [map config](https://github.com/amdjs/amdjs-api/wiki/Common-Config#wiki-packages).

## Common Config: Map

**in the config_map and config_map_* directories**

Support for the [common config API](https://github.com/amdjs/amdjs-api/wiki/Common-Config) section on [map config](https://github.com/amdjs/amdjs-api/wiki/Common-Config#wiki-map).

## Common Config: Module

**in the config_module directory**

Support for the [common config API](https://github.com/amdjs/amdjs-api/wiki/Common-Config) section on [module config](https://github.com/amdjs/amdjs-api/wiki/Common-Config#wiki-config).

## Common Config: Path

**in the config_paths directory**

Support for the [common config API](https://github.com/amdjs/amdjs-api/wiki/Common-Config) section on [paths config](https://github.com/amdjs/amdjs-api/wiki/Common-Config#wiki-path).

## Common Config: Shim

**in the config_shim directory**

Support for the [common config API](https://github.com/amdjs/amdjs-api/wiki/Common-Config) section on [shim config](https://github.com/amdjs/amdjs-api/wiki/Common-Config#wiki-shim).

# License

amdjs-tests is released under two licenses: new BSD, and MIT. See the LICENSE
file for more info.

The individual loader implementations are subject to their own specific
licenses. This license only covers the tests.

