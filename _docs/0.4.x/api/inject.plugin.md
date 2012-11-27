---
layout: api
permalink: /docs/0.4.x/api/Inject.plugin
version: 0.4.x
asOf: 0.4.1
title: Inject.plugin
injectOnly: true
---

{% highlight js %}
Inject.plugin(name, ruleSet, functions?);
{% endhighlight %}

The plugin interface is the primary way to add custom [transpiler](http://en.wikipedia.org/wiki/Source-to-source_compiler) functionality to Inject. For example, a plugin can be written to convert a CSS file into a JavaScript object with methods and properties that make it behave more like JavaScript and less like plain text. Some samples of how plugins may be used:

* converting CSS into an object that can be `require()`ed
* converting Dust templates into their executable JS equivalent
* loading JSON into a local variable

Defining a Plugin
=================
Plugins are defined using `Inject.plugin` and are given at the very least a name and a ruleSet. The ruleSet is identical to an [Inject.addRule](/docs/0.4.x/api/Inject.addRule) rule, except the `options.matches` is inferred by the `name` parameter. All plugins match the syntax:

{% highlight js %}
/^name!.+$/
{% endhighlight %}

The `name!` is the plugin keyword, where "name" matches the name parameter from the plugin call. In fact, you can accomplish 99% of the plugin command using addRule. However, using `plugin` is a clear indicator to other developers that you intend for your code to be modular and used in multiple scenarios.

The 3rd Param: Functions
========================
The third parameter `functions` is an object literal. All items found in this object are copied over to `Inject.plugins[name]`. This allows custom functionality from within a pointcut to access global functionality. The [CSS Plugin](https://github.com/linkedin/inject/blob/master/src/plugins/css.js) is a great example of making global functions available in order to create CSS "objects" which can then be returned as exports.