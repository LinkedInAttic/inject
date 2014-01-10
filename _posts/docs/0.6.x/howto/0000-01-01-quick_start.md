---
layout: docs
version: 0.6.x
title: Quick Start Guide
category: howto
permalink: /docs/0.6.x/howto/quick_start.html
---

**Inject** (Apache Software License 2.0) is a revolutionary way to manage your dependencies in a *Library Agnostic* way. Some of its major features include:

* CommonJS Compliance in the Browser (`module.exports.*`)
* AMD Compliance for Library compatibility (`define()`)
* Cross domain retrieval of files
* localStorage caching to reduce HTTP requests

### Download Inject

The latest version of inject is always available via the source repository at [https://github.com/linkedin/inject/downloads](https://github.com/linkedin/inject/downloads). The most recent version is usually at the top, and inside is the required JS and optional HTML files. Copy them to your own server.

### Adding Inject to Your Page

This walkthrough is assuming you're using a directory called `js` which contains all of your javascript, possibly even this file. It also assumes inside of the `js` directory is a `modules` directory which will contain all of your modules. Your directory layout might look like the following:

{% highlight sh %}
|-index.html
|-relay.html (optional)
|-js
    |-inject.js
    |-modules
      |-math.js
      |-increment.js
      |-program.js
{% endhighlight %}

The location of the modules directory does not need to be under the `inject.js` file, but it's common practice to group files of similar types together such as JavaScript.

### Starting Your JavaScript

To use inject, place the following script tags into the `<head>` of your document

{% highlight html %}
<script type="text/javascript" src="inject.js"></script>
<script type="text/javascript">
  Inject.setModuleRoot("/js/modules");
  require.run("program");
</script>
{% endhighlight %}

* **Inject.setModuleRoot** is the location of ALL your JS modules. Based on the directory structure above, they are located in the `js/modules` directory.
* **require.run** executes your main entry point, whatever it may be. Given the above directory structure, it will run the `program.js` file in your module root (from require.setModuleRoot). The `.js` is added automatically.

### Enabling Cross-Domain Support

To access files on a different domain (such as the case when using a CDN):

1. Upload `relay.swf` and `relay.html` to the server you wish to access and verify these two files are publicly accessible.
2. Enable support using `Inject.setCrossDomain` (see an example in the [Quick Configs](#some-quick-configs) section below).

### Some Quick Configs

Here's some common configuration options you're going to want for Inject

{% highlight js %}
// Set the "root" where all your modules can be found
// you can use an http:// path or just /path/to/modules like above
Inject.setModuleRoot("path");

// Specify how long files should be in localStorage (in minutes)
// or 0 for never, which is great for development
Inject.setExpires(integerValue);

// configure "cross domain" support. You need to put "relay.swf" and "relay.html"
// from the download on to your CDN server for this to work
Inject.setModuleRoot("http://example-cdn.com/modules");
Inject.setCrossDomain({
  relayHtml: "http://example-cdn.com/relay.html",
  relaySwf: "http://example-cdn.com/relay.swf"
});
{% endhighlight %}
