---
layout: docs
version: 0.6.x
title: Using Plugins, Extending Functionality
category: howto
permalink: /docs/0.6.x/howto/using_plugins.html
---

Inject's plugin support allows you to transform and manipulate assets that may not be JavaScript by default. By converting them to JavaScript, you can use these assets just like any other `require` resource. This page talks about how to use the three default plugins that ship with Inject. Feel free to add your own plugins by following the example. Eventually, we expect to have a library of plugins for all.

If you're interested in using a plugin popularized by the AMD Specification, please read the [how-to for AMD](/docs/0.6.x/howto/amd.html).

### Enabling Inject Plugins

Enabling Inject Plugins can be done by adding a script tag to your existing page:

{% highlight html %}
<!-- Just below inject.js, add inject-plugins.js -->
<script type="text/javascript" src="/inject.js"></script>
<script type="text/javascript" src="/inject-plugins.js"></script>
{% endhighlight %}

You're now ready to use the default plugins installed with Inject.

### The Text Plugin

A sample "text" resource:

{% highlight text %}
I'm some really cool text
{% endhighlight %}

Using this text in your code:

{% highlight js %}
var text = require('text!/path/to/text/file.txt');
{% endhighlight %}

The text plugin is the simplest of plugins. It reads in the contents of a text file, and makes it available as a requireable resource.

### The CSS Plugin

A sample "css" resource:

{% highlight css %}
body {
  font-size: 999px;
}
{% endhighlight %}

Using this CSS in your code:

{% highlight js %}
var css = require('css!/path/to/css/file.css');
css.attach();
{% endhighlight %}

The CSS plugin takes a given CSS file, and transforms it into a JavaScript object. The JS object has a single method `attach()` which will apply the styles to the current page in a cross-browser way. This is really helpful in scenarios where you are bundling a complete HTML and CSS combination, but want to wait to attach the styles to minimze reflows.

### The JSON Plugin

A sample "JSON" resource:

{% highlight js %}
{
  "stuff": ["one", "two", "three"],
  "things": {
    "one": "eno",
    "two": "owt",
    "three": "eerht"
  }
}
{% endhighlight %}

Using this JSON in your code:

{% highlight js %}
var data = require('json!/path/to/json/file.json');
console.log(data);
{% endhighlight %}

The JSON plugin reads the JSON file in as text, and automatically performs a `JSON.parse()` on the file contents. The resulting object is made available as the result of the require() call.

### Writing Your Own Plugin

Start with the [Inject.addFetchRule()](/docs/0.6.x/api/inject.addfetchrule.html) API. This allows you to define custom rules for fetching content. Coupled with [Inject.addContentRule()](/docs/0.6.x/api/inject.addcontentrule.html), you can easily transform any file into JavaScript-ready code for use in a module.

The [plugins that Inject comes with](https://github.com/linkedin/inject/tree/master/src/plugins) serve as a great example for getting started.