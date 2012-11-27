---
layout: api
version: 0.4.x
title: require.run
injectOnly: true
---

{% highlight js %}
require.run('moduleName');
{% endhighlight %}

A simple way to invoke a module, where you're not interested in its outcome or exports. This is useful for launching a program, and is shorthand for

{% highlight js %}
require.ensure(['moduleName'], function () {});
{% endhighlight %}