---
layout: docs
version: 0.5.0
title: How Inject Works
category: howto
permalink: /docs/0.5.0x/howto/how_inject_works.html
---

This is a guide that explains the various components of Inject, how they relate to each other, and what exactly happens when you type `require`, `require.ensure`, or many other Inject invocations into your JavaScript.

### Entry Points

The CommonJS and AMD specifications set up a series of global functions that dictate ways to "include" modules. These "entry points" are by default in the browser:

* require('moduleName')
* require.ensure([dependencies], callback(require) {})
* require.run('moduleName')
* define('moduleName', [dependencies], callback([dependencies]...) {})

The most common use case is to start your program. We recommend the use of either `require.ensure` or `define`, depending on if your framework is mostly CommonJS or AMD. Chances are, if you haven't heard of AMD and are coming from Node.JS, you'll want to just use `require.ensure`

{% highlight js %}
require.ensure(['lib/jquery', 'lib/backbone', 'myapp'], function (require) {
  var $ = require('jquery');
  var BB = require('backbone').Backbone;
  var app = require('myapp');
});
{% endhighlight %}

What just happened? Inject looked at the dependencies listed in `require.ensure`, downloaded them, executed them, and made them available to your callback function (the second parameter). You can then ask for those dependencies by saying `require('moduleName')` and store the variable locally.

In this example, there is no global jQuery, no global Backbone... everything is self contained. There's no variable leakage and the world of Browser based JavaScript just got a little bit better.

If this was all you were hoping for to sleep a bit better at night, I recommend jumping back to the [Quick Start Guide](/docs/0.5.0/howto/quick_start.html). If you're wanting to know more about Inject's internals and how your request is formed, keep reading.

### How A Request Flows Through Inject

Starting from the Entry Points listed above, Inject will

1. Look for your list of dependencies
2. Convert the dependencies into fully qualified Module Identifiers
3. Turn those same Module Identifiers into URLs
4. Download the contents of those URLs
5. Apply any pointcuts to the resulting contents
6. When all contents have been downloaded and massaged, execute the JavaScript we have, starting at the lowest level dependency
7. Return control back to your calling code

The remainder of this article breaks down these 7 steps, the `Objects` in play, and the roles they serve.

### Your Entry Point is Actually a RequireContext

The `RequireContext` is actually the touch point whenever you use an Entry Point function. A context defines your current location in your module heirarchy. This is because [module identifiers must resolve relative to their parents](/docs/0.5.0/howto/resolve_modules.html). When you first touch an entry point, the Module Identifier is `null`.

Invoking an entry point starts the creation of a Tree, expressed by our `TreeDownloader` and `TreeNode`. In Inject, we must construct a list of dependencies so that we know both what must be downloaded and what must be executed.

### TreeDownloader and "The Loop"

`TreeDownloader` is a bit of a misnomer. It's really the "TreeController", but it hasn't been renamed yet. The `TreeDownloader` is a very sequential piece of code.

1. Given a node...
2. Ask the `RulesEngine` to convert this node's ID into a Module Identifier
3. Ask the `RulesEngine` to convert this Module Identifier into a URL
4. Ask the `Communicator` to download the URL (async)
5. (onComplete) ask the `RulesEngine` for a collection of pointcuts
6. Apply these pointcuts to the contents
7. Ask the `Analyzer` to provide a list of dependencies
8. For each dependency...
  1. Create a new `TreeNode` for the dependency
  2. Return to (1) "Given a node..." to resolve that branch of the tree
9. When all dependencies are resolved
10. Ask `Executor` to Execute a given collection of `TreeNodes`
11. (onComplete) fire the requested callback

The ultimate artifact that comes out of `TreeDownloader` is a complete Tree:

![A Dependency Tree](/docs/0.5.0/howto/how_inject_works/tree.png "A Dependency Tree")

In the above tree, we've built out all our dependencies and downloaded all the code. When `TreeDownloader` encountered "B" for the second time, it traversed parents and found that it was "Circular". Circular nodes won't execute their first time through (or else you'd be caught in a perpetual execution loop), and they are automatically assigned zero dependencies (or else you'd be downloading forever).

### Post-Download, the Executor

The `Executor` does the heavy lifting of running code for Inject. It receives a `TreeNode` with children from the `TreeDownloader`, and must:

1. Get a post-order traversal of the tree
2. Starting with the lowest level dependencies, wrap the code in a sandbox
3. Write out and execute the JavaScript
4. Collect the exports
5. When the tree is executed, fire the callback

A [Post-Order Traversal](http://en.wikipedia.org/wiki/Tree_traversal#Example) allows us to walk the tree in array form, starting from the lowest level dependencies. An item with zero dependencies is safe to run, whereas an item with &gt; 0 dependencies must have all dependencies executed before using it.

The sandboxing code is a template that puts in place a CommonJS scaffold:

* expose a global "module" and "exports" object
* create a "require" function that uses `RequireContext` to ensure relative modules resolve properly
* wrap the code in a function to prevent variable leakage
* test for syntax errors
* Run the code within the scope of the "module" object via a `fn.call()` invocation

Once `eval()` runs over the newly sandboxed code, the module (and its exports) can be retrieved from the sandbox. These results are cached in the `Executor` for later, and are supplied on demand when there is a call to `require()` from within a `RequireContext`.

### Rules and the RulesEngine

The `RulesEngine` is the storage location for rules, and contains methods for applying those rules to either a Module Identifier or a URL. It currently contains:

* A method that lets you add more rules to the engine
* The ability to sort the rules based on weight
* Functionality to convert a Module Identifier into a Resolved Module Identifier (with relative paths solved)
* The ability to convert a Resolved Module Identifier into a URL

It doesn't depend on any additional modules.

### The Analyzer

The `Analyzer` serves as an adaptor for the [Link.JS](https://github.com/calyptus/link.js) library. It can extract a set of dependencies from a given text string (a file). It is also able to remove "builtin" globals such as `require`, `module`, and `exports` from a list of dependencies.

### The Communicator

The `Communicator` is responsible for the retrival and (possible) downloading of files. It is asynchronous in nature. It makes use of two libraries:

* [easyXDM](http://easyxdm.net/) for cross-domain communication
* [lscache](https://github.com/pamelafox/lscache) to provide a simple LRU on top of localStorage

The `Communicator` is the authority on a file's content. When asked to retrieve a URL, it will first check within localStorage. If there is no file in localStorage, it will then check if the request is cross-domain. If the request is **not** cross-domain, it will make a local xmlHttpRequest for the file's contents and return that. Otherwise, it will use easyXDM to establish a cross-domain channel to the remote server for downloading the file.

easyXDM requires two pieces: an html file on the remote server and a SWF file on the remote server in a known location. Both of these dependencies are solved by using the [Inject.setCrossDomain](/docs/0.5.0/api/inject.setcrossdomain.html) method.

### InjectCore's Purpose

The `InjectCore` object is primarily used for configuration. Most global methods under the `Inject.*` namespace reference methods in `InjectCore`. It may also reach in to configure specific libraries such as easyXDM and lscache.

### Other Files

There are other files that play in to inject. This serves as a partial reference to those files:

* **compat/___**: Contains the IE7 compatibility layer files. A localStorage emulator using UserData, a set of shimmable content for IE, and "the smallest image resource ever". Also includes a copy of JSON for browsers that don't have the support.
* **includes/___**: Contains constants, global variables, configuration for libraries, and licenses
* **lib/___**: Our libraries
* **plugins/__**: Sample plugins we ship with
* **xd/__**: The files needed by the `Communicator` if you are using the cross-domain functionality