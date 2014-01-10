---
layout: docs
version: 0.6.x
title: How Modules are Resolved
category: howto
permalink: /docs/0.6.x/howto/resolving_modules.html
---

Module resolution in Inject follows the AMD and CommonJS specification. There are three governing rules:

1. module identifers are **relative** when their path begins with `./` or `../`. If their path does not begin with either of these, the module identifier is considered **non-relative**
2. **non-relative** module identifiers are left alone
3. **relative** module identifiers are relative to the module that made the request

Consider the following code structure:

{% highlight sh %}
|-modules
  |-sub
    |-a.js
    |-program.js
  |-a.js
{% endhighlight %}

The module root is set to `modules` above. You then run the `program.js` module, which looks like so:

{% highlight js %}
var one = require('a.js');
var two = require('../a.js');
var three = require('./a.js');

module.exports.one = one.text;
module.exports.two = two.text;
module.exports.three = three.text;
{% endhighlight %}

`modules/sub/a.js` is:
{% highlight js %}
module.exports.text = 'modules/sub/a.js';
{% endhighlight %}

and `modules/a.js` is:
{% highlight js %}
module.exports.text = 'modules/a.js';
{% endhighlight %}

The exports from `program.js` will contain `one`, `two`, and `three`. Even if you adjust the URL in Inject using a function like [Inject.addFileRule](/docs/0.6.x/api/inject.addfilerule.html), the module's IDs will continue to map as expected.

{% highlight js %}
{
  one: 'modules/a.js',      // non-relative (a.js)
  two: 'modules/a.js',      // relative (../a.js)
  three: 'modules/sub/a.js' // relative (./a.js)
}
{% endhighlight %}

### Why is This So?

There's very little documentation as to the "why" behind this, so we'd like to take the time as part of the Inject framework to explain the rationale behind module IDs versus URLs. To find a real use case, the [npm](http://npmjs.org) provides a perfect example. Each node 'module' can have its own internal dependencies. It doesn't know (or care) what the rest of the system is doing. Instead, by running `npm install`, you mount an entire module and its sub modules to a predefined location.

Bring this back now to the web. It would be great if you could request a "carousel" module, have it depend on jQuery, and have it use its own version of jQuery internally. Then, even as you upgrade jQuery elsewhere, you don't have to worry about your carousel unexpectectly breaking. There's a small price to pay in potentially having multiple copies of a submodule floating around, but the dependency management (and lack of regressions) is worth its weight in gold on large scale sites.

### What About Download Size / HTTP Requests?

In a browser world, it may not be feasible to have 4 different files all depend on their own version of jQuery. In these cases, a common name can be used. For example, jQuery will always mount itself into the "jquery" module space, making it accessible from anywhere in the module tree. Since we don't really endorse the behavior of named modules, we also allow for the `addPackage` call in Inject, which lets you say "hey, let calls for my X module, also be okay for Y module".

{% highlight js %}
// this maps the modernizr version x.y into the global
// "modernizr" namespace
Inject.addPackage('modernizr/modernizr-1.7.min.js', 'modernizr');
{% endhighlight %}