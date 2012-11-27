---
layout: api
version: 0.4.x
title: Inject.setModuleRoot
injectOnly: true
---

{% highlight js %}
Inject.setModuleRoot('/path/to/js');
Inject.setModuleRoot('http://example.com/path/to/js');
{% endhighlight %}

Specify the path to your "modules" directory. This path can either be defined with a leading slash for same-server downloads, or can be given a full http URL for absolute paths or instances where you might be [using a CDN with Inject](/docs/0.4.x/howto/cross_domain.html). Inject uses this path when converting a module's identifier into a URL.