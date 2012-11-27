---
layout: api
version: 0.4.x
title: Inject.clearCache
injectOnly: true
---

{% highlight js %}
Inject.clearCache();
{% endhighlight %}

Removes all localStorage caches. This does **not** remove any rules added with addRule or the current cache of module.exports for the exiting page load.

For these, you should use [Inject.reset](/docs/0.4.x/api/inject.reset.html)