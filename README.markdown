You are viewing the README for the current branch of Inject. This is master-0.4.x

<table>
  <tr>
    <th colspan="2">Healthchecks</th>
  </tr>
  <tr>
    <td>master</td>
    <td><a href="http://travis-ci.org/#!/linkedin/inject/branch_summary"><img src="https://secure.travis-ci.org/linkedin/inject.png?branch=master"/></td>
  </tr>
  <tr>
    <td>v0.4.x</td>
    <td><a href="http://travis-ci.org/#!/linkedin/inject/branch_summary"><img src="https://secure.travis-ci.org/linkedin/inject.png?branch=v0.4.x"/></td>
  </tr>
  <tr>
    <td>v0.3.x</td>
    <td><a href="http://travis-ci.org/#!/linkedin/inject/branch_summary"><img src="https://secure.travis-ci.org/linkedin/inject.png?branch=v0.3.x"/></td>
  </tr>
</table>

Inject: Dependency Management Got Awesome
===
**Inject** (Apache Software License 2.0) is a revolutionary way to manage your dependencies in a *Library Agnostic* way. Some of its major features include:

* CommonJS Compliance in the Browser (exports.*)
  * View the full [CommonJS Support Matrix](https://github.com/linkedin/inject/wiki/CommonJS-Support)
* Cross domain retrieval of files (via easyXDM)
* localStorage (load a module once)
* Frustratingly Simple

Some of the awesome roadmap things coming soon(ish)

* versioning (once we re-expose modules.* interface most likely)

Let's Start With Examples!
===
We have a nodejs test server for both the examples and development. Install node and npm, then:

```
cd inject
npm install
node makefile.js build
node makefile.js server
```

You can visit http://localhost:4000/examples/ for viewing some sample code, or http://localhost:4000/tests for running our unit test suite. We use alternate ports to create the cross domain environment instead of a CDN.

If you have PhantomJS (http://phantomjs.org/download.html) in your binary path, you can start the node server from above and kick off a PhantomJS version.

```sh
phantomjs tests/run-qunit.js http://localhost:4000/tests/tests.html

# or the travisCI version w/ granularity

phantomjs tests/run-qunit.js http://localhost:4000/tests/tests.html?filter=src%20%3A%3A &&
phantomjs tests/run-qunit.js http://localhost:4000/tests/tests.html?filter=spec%20%3A%3A%20CommonJS &&
phantomjs tests/run-qunit.js http://localhost:4000/tests/tests.html?filter=spec%20%3A%3A%20AMD &&
phantomjs tests/run-qunit.js http://localhost:4000/tests/tests.html?filter=integration%20%3A%3A
```

Getting Started
===
In case you're looking: [Building Inject From Source](https://github.com/linkedin/inject/wiki/0.4.x-Building-Inject-From-Source)

We've put together a [Getting Started With inject Guide](https://github.com/linkedin/inject/wiki/0.4.x-Getting-Started) which is a launching point to all to functionality inject has to offer. If you're already familiar with CommonJS-style modules, than you can probably start right there.

Writing CommonJS Compliant Modules
===
While not a requirement, the natural encapsulation CommonJS provides allows you to make only specific parts of your file available to the function that requested its injection. The local variable `exports` is made available as an object literal. At the terminus of your file, anything assigned to `exports` will be available as part of the module's package. If you want something private, simply don't export it.

A very simple module could be the following

```
var waterfowl = function() {};
waterfowl.prototype.quack = function() {
  alert("Quack!");
};

exports.duck = waterfowl
```

If you injected this file, you could then say `var duck = new moduleName.duck()` and instantiate your object.

Modifying your Library to Work with Inject
===
Sometimes, you have a library (jQuery, or Modernizr for example) which isn't CommonJS compliant. We've put together a [page of recipes](https://github.com/linkedin/inject/wiki/0.4.x-addRule-and-Your-Favorite-Library) for using the addRule() API with your favorite library.

JavaScript Minifiers
===
If you're using a JS Minifier for your module files (and you probably should), there are some important compilation options you need. Many minifiers obfuscate and optimize variables inside of functions, which will affect the ability of inject to identify your dependencies before runtime. For the greatest in-browser optimization, we recommend using [UglifyJS](https://github.com/mishoo/UglifyJS) since it allows you to protect specific reserved names while still mazimixing the amount of compression you can do. If running node isn't an option, YUI and Google compressors can also be used with the following options:

* UglifyJS: `--reserved-names “require,exports,module"`
* YUI Compressor: `--nomunge`
* Google Closure: `--compilation_level WHITESPACE_ONLY`

If your compression engine of choice isn't on the list, and has the ability to protect/preserve certain names, send us a bug with the settings and we'll add it to the list. As a last ditch effort, you can often put an `eval();` after your return statement. For most optimizers, the addition of an eval will prevent variable munging within the current scope chain.

API Notes
===
Path Resolution
---
By default, inject tries to do the best it can, but in complex environments, that's not enough. The following behaviors can change / simplify the injection of modules.

* **call Inject.setModuleRoot with a function** if config.path resolves to a function, the function will be called instead of standard path evaluation
* **use Inject.addRule(match, rules)** the addRule() syntax allows you to match regex statements against a module path, and resolve items dynamically

Expiring Content
---
By default, inject() will cache things for one day (1440 minutes). You can change the default behavior through the config object:

```
Inject.setExpires(10080);
// files now last for one week
```

Setting an expiry value of "0" means that client side caching will not be used. There will need to be a balance between caching items in the browser, and letting localStorage also do caching for you. At any time, you can always clear the cache with the below code, for example if a user has not been to your site since your last major code push.

```
Inject.clearCache()
```

Cross Domain
---
In CDN-like environments, the data you need to include may be on a separate domain. If that's the case, you'll need to do 3 extra steps to get inject up and running.

1. **edit relay.html** from the artifacts directory if you want additional security.
2. **edit your code** Inject.setCrossDomain needs an object literal with two items: `relayFile` and `relaySwf`. Set these to the location of your remote `relay.swf` and `relay.html` files appropriately.
3. **upload both relay.html and relay.swf files** to your servers

Your config looks something like...

```js
Inject.setCrossDomain({
  relayFile: "http://cdn.example.com/relay.html",
  relaySwf: "http://cdn.example.com/relay.swf"
});
```

You can then carry on with your injecting. To support the cross domain, we use `window.postMessage` in the browsers that support it, and fall back to fragment transports with window.resize monitoring. To make that happen, we use [easyXDM](https://github.com/oyvindkinsey/easyXDM) by the awesome @oyvindkinsey (MIT License).

Libraries Used By This Project
===
* easyXDM: Cross Domain Communication
* lscache: LocalStorage Cache Provider 
* (and a whole lot of npm related things for development)
