Inject: Dependency Management Got Awesome
===
**Inject** (Apache Software License 2.0) is a revolutionary way to manage your dependencies in a *Library Agnostic* way. Some of its major features include:

* CommonJS Compliance in the Browser (exports.*)
  * View the full [CommonJS Support Matrix](https://github.com/linkedin/inject/wiki/CommonJS-Support)
* Cross domain retrieval of files (via Porthole)
* localStorage (load a module once)
* Frustratingly Simple

Some of the awesome roadmap things coming soon(ish)

* versioning (once we re-expose modules.* interface most likely)

Let's Start With Examples!
===
We have a nodejs test server for both the examples and development. Install node, npm, & coffeescript, then:

```
cake build
npm install
node testserver.js
```

You can visit http://localhost:4000/examples/ for viewing some sample code, or http://localhost:4000/tests for running our unit test suite. We use alternate ports to create the cross domain environment instead of a CDN.

Getting Started
===
We've put together a [Getting Started With inject Guide](https://github.com/linkedin/inject/wiki) which is a launching point to all to functionality inject has to offer. If you're already familiar with CommonJS-style modules, than you can probably start right there.

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

API Notes
===
Path Resolution
---
By default, inject tries to do the best it can, but in complex environments, that's not enough. The following behaviors can change / simplify the injection of modules.

* **call require.setModuleRoot with a function** if config.path resolves to a function, the function will be called instead of standard path evaluation
* **use require.addRule(match, rules)** the addRule() syntax allows you to match regex statements against a module path, and resolve items dynamically

Expiring Content
---
By default, inject() will cache things for one day (1440 minutes). You can change the default behavior through the config object:

```
require.setExpires(10080);
// files now last for one week
```

Setting an expiry value of "0" means that client side caching will not be used. There will need to be a balance between caching items in the browser, and letting localStorage also do caching for you. At any time, you can always clear the cache with the below code, for example if a user has not been to your site since your last major code push.

```
require.clearCache()
```

Cross Domain
---
In CDN-like environments, the data you need to include may be on a separate domain. If that's the case, you'll need to do 3 extra steps to get inject up and running.

1. **edit relay.html** from the artifacts directory. You'll need to call require.setCrossDomain(local, remote) with the path to your two proxy files. The "local" is on the same domain as your application code. The "remote" is on the same domain as the JS you intend to load, and should be the same domain you supplied to require.setModuleRoot()
2. **edit your code** use the same require.setCrossDomain(local, remote) to set up the configuration for cross domain
3. **upload both relay.html files** to your servers

When you add the XD config, you'll use the same paths you used in #1 above

```
require.setCrossDomain("http://static.example.com/path/to/relay.html", "http://example.com/local/dir/relay.html");
```

You can then carry on with your injecting. To support the cross domain, we use `window.postMessage` in the browsers that support it, and fall back to fragment transports with window.resize monitoring. To make that happen, we use [Porthole](http://ternarylabs.github.com/porthole/) by the awesome Ternary Labs folks (MIT License).

Also Starring
===
* Porthole: Cross Domain Communication
* lscache: LocalStorage Cache Provider 
* Google Closure Compiler
