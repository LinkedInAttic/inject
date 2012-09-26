* InjectJS Mailing List: https://groups.google.com/forum/#!forum/injectjs
* 0.4.x: [![View Summary](https://secure.travis-ci.org/linkedin/inject.png?branch=v0.4.x)](http://travis-ci.org/#!/linkedin/inject/branch_summary)
* master: [![View Summary](https://secure.travis-ci.org/linkedin/inject.png?branch=master)](http://travis-ci.org/#!/linkedin/inject/branch_summary)

# Welcome
**Inject** (Apache Software License 2.0) is a revolutionary way to manage your dependencies in a *Library Agnostic* way. Some of its major features include:

* CommonJS Compliance in the Browser (exports.*)
  * View the full [CommonJS Support Matrix](https://github.com/linkedin/inject/wiki/CommonJS-Support)
* Cross domain retrieval of files (via easyXDM)
* localStorage (load a module once)
* Frustratingly Simple

# Getting Started With Inject
This page is designed to get you up and running with the latest version of Inject. For greater detail, there is an Advanced Usage section, and a guide to the API.

# Download Inject
The latest version of inject is always available via the source repository at [http://www.injectjs.com/download/](http://www.injectjs.com/download/). The most recent version is usually at the top, and inside is the required JS and optional HTML files. Copy them to your own server.

# Adding Inject to Your Page
This walkthrough is assuming you're using a directory called `js` which contains all of your javascript, possibly even this file. It also assumes inside of the `js` directory is a `modules` directory which will contain all of your modules. Your directory layout might look like the following:

```
|-index.html
|-relay.html (optional)
|-js
    |-inject.js
    |-modules
      |-math.js
      |-increment.js
      |-program.js
```

The location of the modules directory does not need to be under the `inject.js` file, but it's common practice to group files of similar types together such as JavaScript.

# Starting Your JavaScript
To use inject, place the following script tags into the `<head>` of your document

```html
<script type="text/javascript" src="inject.js"></script>
<script type="text/javascript">
  Inject.setModuleRoot("/js/modules");
  require.run("program");
</script>
```

* **Inject.setModuleRoot** is the location of ALL your JS modules. Based on the directory structure above, they are located in the `js/modules` directory.
* **require.run** executes your main entry point, whatever it may be. Given the above directory structure, it will run the `program.js` file in your module root (from require.setModuleRoot). The `.js` is added automatically.

# Some Quick Configs
Here's some common configuration options you're going to want for Inject

```js
// Set the "root" where all your modules can be found
// you can use an http:// path or just /path/to/modules like above
Inject.setModuleRoot("path");

// Specify how long files should be in localStorage (in minutes)
// or 0 for never, which is great for development
Inject.setExpires(integerValue);

// configure "cross domain" support. You need to put "relay.swf" and "relay.html"
// on your remote server for this to work
Inject.setModuleRoot("http://example-cdn.com/modules");
Inject.setCrossDomain({
  relayHtml: "http://example-cdn.com/relay.html",
  relaySwf: "http://example-cdn.com/relay.swf"
});
```

# Writing Some Modules
When you're ready to write your own modules, have a look at the [CommonJS Module Examples](https://github.com/linkedin/inject/wiki/CommonJS-Module-Examples) to get started.

# Building From Source
We have a whole section on building from source. [Building From Source](https://github.com/linkedin/inject/wiki/0.4.x-Building-Inject-From-Source) has all the juicy details.

# Next Steps
From here, you can...

* learn advanced syntax such as Inject.addRule() for custom module routing  
  [addRule and Routing](https://github.com/linkedin/inject/wiki/0.4.x-addRule-and-Your-Favorite-Library)
* make asynchronous includes using require.ensure() or go cross-domain  
  [Advanced Usage API Guide](https://github.com/linkedin/inject/wiki/0.4.x-Advanced-Usage)
* use AMD-compliant modules with define()  
  [Advanced Usage API Guide](https://github.com/linkedin/inject/wiki/0.4.x-Advanced-Usage)
* use existing libraries that you never thought had CommonJS Support  
  [Recipies for Inject and Your Favorite Library](https://github.com/linkedin/inject/wiki/0.4.x-addRule-and-Your-Favorite-Library)
* learn how to protect your code from JS minifiers  
  [Common Minification Problems](https://github.com/linkedin/inject/wiki/Common-Minification-Problems)

# On The Shoulders of Giants
Inject couldn't be as great as it is without these other rockstar libraries:

* easyXDM: Cross Domain Communication
* lscache: LocalStorage Cache Provider 
* link.js: dependency extraction (from their src/Library/link.js)
* GoWithTheFlow.js: simple flow control
* (and a whole lot of npm related things for development) 
