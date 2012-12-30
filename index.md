---
layout: home
---

**Inject is the link that brings CommonJS to the Browser.** Inject is a fast and lightweight library that removes the pain of dependencies in the browser. If you've written modules for [node.js](http://nodejs.org), then you're equipped to write code for the browser using Inject. **Our mission is to make managing JavaScript dependencies painless.**

* CommonJS **and** AMD Compliant
* Works with CDNs and cross-domain requests out of the Box
* Supports localStorage when available

# In Action
<span id="demo-tag">Incoming</span>

{% highlight html %}
<script type="text/javascript" src="/scripts/lib/inject-v0.4.0/inject.js"></script>
<script type="text/javascript">
  Inject.setModuleRoot("/scripts/demo/modules");
  require.run("program");
</script>
{% endhighlight %}

Check the source of [program.js](/scripts/demo/modules/program.js) and [change_span.js](/scripts/demo/modules/change_span.js).

# Download Inject
The latest version of inject is always available via the source repository at [http://www.injectjs.com/download](http://www.injectjs.com/download). The most recent version is usually at the top, and inside is the required JS and optional HTML files. Copy them to your own server.

# Adding Inject to Your Page
This walkthrough is assuming you're using a directory called `js` which contains all of your javascript, possibly even this file. It also assumes inside of the `js` directory is a `modules` directory which will contain all of your modules. Your directory layout might look like the following:

{% highlight js %}
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

# Starting Your JavaScript
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
* **Inject.setExpires(minutes)** allows you to change how long things are cached in localStorage

# Getting Fancy
Advanced topics such as loading from CDNs (Cross-Domain support), use AMD functionality, importing your favorite non-CommonJS library, and more can all be found in the [Documentation](/docs/).