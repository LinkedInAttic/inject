Inject: Dependency Management Got Awesome
===
**Inject** (MIT License) is a revolutionary way to manage your dependencies in a *Library Agnostic* way. Some of its major features include:

* CommonJS Compliance in the Browser (exports.*)
* Cross domain retrieval of files (via Porthole)
* localStorage (load a module once!) w IE 7 support
* Frustratingly Simple

Some of the awesome roadmap things coming soon(ish)

* versioning (once we re-expose modules.* interface most likely)
* localStorage space management (time based + config? LRU? who knows?!)

Getting Started
===
First, you'll need to include inject.js somewhere on your page. Preferably before you go injecting all over the place. While not required, you may also want to set up a config in case your JS live in a common directory not immediately under the current page.

```
<script type="text/javascript" src="http://example.com/inject-0.0.1.js"></script>
<script type="text/javascript">
  inject().config({
    path: "http://example.com/static/js/"
  });
</script>
```

You can then just start injecting modules and off you go!

```
// in some file later on
inject("moduleA", "moduleB", "moduleC/SomePart", function(A, B, C) {
  // fired when all modules are loaded
  // if exports.* are set, they'll be available in A, B, and C
});
```

By default, modules map to `path` + `moduleName` + `".js"`. If you have a much more complex scheme, you can map things manually using the `modules()` config or by passing a function to `config.path` for resolving paths yourself.

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

Path Resolution
===
By default, inject tries to do the best it can, but in complex environments, that's not enough. The following behaviors can change / simplify the injection of modules.

* **set config.path to a function** if config.path resolves to a function, the function will be called instead of standard path evaluation
* **register modules with inject().modules({...})** the .modules() method allows you to specify key/value pairs which supersede path evaluation

Expiring Content
===
By default, inject() will cache things for one day (86400 seconds). You can change the default behavior through the config object:

```
inject().config({
  fileExpiry: 604800 // files now last for one week
})
```

Setting an expiry value of "0" means that client side caching will not be used. There will need to be a balance between caching items in the browser, and letting localStorage also do caching for you. At any time, you can always clear the cache with the below code, for example if a user has not been to your site since your last major code push.

```
inject().clear()
```

Cross Domain
===
In CDN-like environments, the data you need to include may be on a separate domain. If that's the case, you'll need to do 3 extra steps to get inject up and running.

1. **edit relay.html** from the artifacts directory. You'll need to change `PROXY_LOCATIONS` to the location of your relay.html files. You'll need one path on your main server (inject) and one path on the server that contains all your javascript (xhr)
2. **add to inject().config()** You'll then need to add the config for your XD files (below)
3. **upload both relay.html files** to your servers

When you add the XD config, you'll use the same paths you used in #1 above

```
inject().config({
  xd: {
    xhr: "http://static.example.com/path/to/relay.html",
    inject: "http://example.com/local/dir/relay.html"
  }
});
```

You can then carry on with your injecting. To support the cross domain, we use `window.postMessage` in the browsers that support it, and fall back to fragment transports with window.resize monitoring. To make that happen, we use [Porthole](http://ternarylabs.github.com/porthole/) by the awesome Ternary Labs folks (also MIT License).

Also Starring
===
* Porthole: Cross Domain Communication
* PersistJS: LocalStorage and More
* JSON: Stringy Object Deliciousness
* Google Closure Compiler

Live Awesomeness
===
We have live examples [here](http://jakobo.github.com/inject/example/0.1.0/sample.html) with Same and Alternate domains. These pages are viewable in the [gh-pages branch](https://github.com/Jakobo/inject/tree/gh-pages). CoralCDN provides the second domain which is a might-handy CDN simulation given it's actually a CDN for the alternate domain.