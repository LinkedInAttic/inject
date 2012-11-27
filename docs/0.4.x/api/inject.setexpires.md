---
layout: api
version: 0.4.x
title: Inject.setExpires
injectOnly: true
---

{% highlight js %}
Inject.setExpires(minutes);
{% endhighlight %}

Specifies a number of minutes that items should persist in localStorage. A value of **-1** can be used to ensure no files are retained in localStorage, useful for development.