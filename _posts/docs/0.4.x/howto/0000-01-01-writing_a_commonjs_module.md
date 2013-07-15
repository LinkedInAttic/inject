---
layout: docs
version: 0.4.x
title: Writing a CommonJS Module
category: howto
permalink: /docs/0.4.x/howto/writing_a_commonjs_module.html
---

To get started writing CommonJS compliant modules, you can use one of two formats. The most common implementations are the Modules 1.0 specification commonly seen in nodejs, and the Asynchronous Module Definition which bears a resemblance to the dojo and ender loaders for the browser.

```js
// commonJS boilerplate

// sample code
var bar = require("biz")
var yourValue = bar.getFoo() + "extra";
// end sample code

exports.yourExport = yourValue;
```

In CommonJS, your files will receive automatic scope insulation, and any variables declared with `var` will be scoped to the current file. To share objects from your file, you assign them to the globally available `exports` object. Anything assigned to `exports` will be made available to other modules, but anything you don't assign will remain internal to the file. This process can create new patterns for public/private/privileged design. Upon loading, `require` statements are located, and the dependencies loaded. This means there is no need to declare dependencies upfront.

```js
// AMD boilerplate
define("moduleName", function(require, module, exports) {
  // sample code
  var bar = require("biz")
  var yourValue = bar.getFoo() + "extra";
  // end sample code

  exports.yourExport = yourValue;
});
```

The AMD boilerplate is nearly identical to CommonJS. The big difference is the `define()` method which wraps the code. While there are many variants to `define()` which are allowed, this is the system compatible with the highest number of loader functions. Whereas the CommonJS boilerplate sets up the anonymous scope, you must rely on the AMD closure to do this for you. The `moduleName` is optional, but needed if you're concatenating files together.

Why Modules?
===
Isolation and reusability are the two main reasons for adopting module usage. As an added bonus, the two most common module implementations provide scope protection and a somewhat sandboxed environment. This results in a very powerful system for including code.