---
layout: docs
version: 0.4.x
title: Using Inject on Multiple Domains
category: howto
permalink: /docs/0.4.x/howto/cross_domain.html
---

In large site deployments, it may be necessary to run Inject using a Content Delivery Network (or "CDN"). Many times, the use of a CDN puts resources on a server and domain different than the main page. This howto is all about how you set up Inject to work in a CDN environment.

We're going to assume you have two servers:

* http://example.com is your website
* http://cdniscool.com is your CDN location (and the scripts are under /js/modules)

### What to Upload Remotely

On the remote server, you'll need to upload two files, the `relay.swf` and the `relay.html` file onto your CDN. For simplicity sake, we're going to put these in your module's root directory.

{% highlight sh %}
# server: cdniscool.com
js/
  modules/
relay.swf
relay.html
{% endhighlight %}

What's important is that you can put the URL to your CDN into your browser and reach the two files. In the above case, you should be able to reach `http://cdniscool.com/relay.html` and `http://cdniscool.com/relay.swf` via a normal web browser.

### Configuring Inject

Given the CDN location, we will need to use both [Inject.setModuleRoot](/docs/0.4.x/api/inject.setmoduleroot.html) and [Inject.setCrossDomain](/docs/0.4.x/api/inject.setcrossdomain.html) to configure this installation of Inject. `setModuleRoot` tells Inject your files are on another server, while `setCrossDomain` tells inject where the two helper files are that it will need for cross-domain downloading.

{% highlight js %}
Inject.setModuleRoot('http://cdniscool.com/js/modules');
Inject.setCrossDomain({
  relayFile: 'http://cdniscool.com/relay.html',
  relaySwf:  'http://cdniscool.com/relay.swf'
});
{% endhighlight %}
