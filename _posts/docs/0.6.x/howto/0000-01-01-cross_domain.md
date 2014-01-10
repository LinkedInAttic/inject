---
layout: docs
version: 0.6.x
title: Using Inject on Multiple Domains
category: howto
permalink: /docs/0.6.x/howto/cross_domain.html
---

In large site deployments, it may be necessary to run Inject using a Content Delivery Network (or "CDN"). Many times, the use of a CDN puts resources on a server and domain different than the main page. This howto is all about how you set up Inject to work in a CDN environment.

We're going to assume you have two servers:

* http://example.com is your website
* http://cdniscool.com is your CDN location (and the scripts are under /js/modules)

### What to Upload Remotely

On the remote server, you'll need to upload a file. Place the `relay.html` file onto your CDN. For simplicity sake, we're going to put this in your module's root directory.

{% highlight sh %}
# server: cdniscool.com
js/
  modules/
relay.html
{% endhighlight %}

What's important is that you can put the URL to your CDN into your browser and reach the two files. In the above case, you should be able to reach `http://cdniscool.com/relay.html` via a normal web browser.

### Configuring Inject

Given the CDN location, we will need to use both [Inject.setModuleRoot](/docs/0.6.x/api/inject.setmoduleroot.html) and [Inject.setCrossDomain](/docs/0.6.x/api/inject.setcrossdomain.html) to configure this installation of Inject. `setModuleRoot` tells Inject your files are on another server, while `setCrossDomain` tells inject where the helper file is that it will need for cross-domain downloading.

{% highlight js %}
Inject.setModuleRoot('http://cdniscool.com/js/modules');
Inject.setCrossDomain({
  relayFile: 'http://cdniscool.com/relay.html'
});
{% endhighlight %}

### A Note About IE7 and Below

In some circumstances, it may be required to support IE7 and older browsers. In those scenarios, we recommend adding a Fetch Rule that passes the request through easyXDM. Setting up easyXDM using their CORS interface is straightforward, and the rule as well as easyXDM only need to be added if window.postMessage is not available.

{% highlight js %}
if (!window.postMessage) {
  // from http://easyxdm.net/wp/2010/03/17/cross-domain-ajax/
  // place the easyXDM CORS file alongside your relay.html file
  var xhr = new easyXDM.Rpc({
    remote: "http://other.domain/cors/"
  }, {
    remote: {
      request: {} // request is exposed by /cors/
    }
  });

  Inject.addFetchRule(/^.+$/, function (next, content, resolver, communicator, options) {
    var moduleId = resolver.module(options.moduleId, options.parentId);
    var moduleUrl = resolver.url(moduleId, options.parentUrl);
    
    xhr.request({
      url: moduleUrl,
      method: "GET"
    }, function(response) {
      if (response.status != 200) {
        throw new Error('unable to retrieve ' + moduleUrl);
      }
      next(null, response.data);
    });
  }
}
{% endhighlight %}