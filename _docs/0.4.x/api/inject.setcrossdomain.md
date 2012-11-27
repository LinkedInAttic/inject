---
layout: api
permalink: /docs/0.4.x/api/Inject.setCrossDomain
version: 0.4.x
title: Inject.setCrossDomain
injectOnly: true
---

{% highlight js %}
Inject.setCrossDomain({
  relayFile: 'http://example.cdn.com/relay.html',
  relaySwf:  'http://example.cdn.com/relay.swf'
});
{% endhighlight %}

When [running Inject on multiple domains](/docs/0.4.x/howto/cross_domain), you need to specify the path to an HTML and SWF file located on the remote server. These two files enable remote downloading in a CORS-like implementation, while still supporting older browsers. The two paths should be passed in as part of the object literal.