---
layout: docs
version: 0.6.x
title: Using Inject With Your Favorite Library
category: howto
permalink: /docs/0.6.x/howto/inject_and_libraries.html
---

Many libraries can be "shimmed" to work with Inject, even if they don't support a CommonJS or AMD system. These are uses of [Inject.addRule](/docs/0.6.x/api/inject.addrule.html) to change the code within the scope of Inject, while leaving the default library unaltered.

We're always up for adding more recepies for peoples' favorite libraries.

### jQuery

In [jQuery](http://jquery.com/), we modify the code to assign `jQuery.noConflict()` into `module.exports`.

{% highlight js %}
Inject.addContentRule(/jquery-1\.7\.js/, function(next, text) {
  next(null, [
    'var oldJQ = window.jQuery;',
    text,
    'module.setExports(jQuery.noConflict());',
    'delete window["jQuery"];',
    'window.jQuery = oldJQ;',
  ''].join('\n'));
});
{% endhighlight %}

In a multi-jQuery environment, the most recently loaded jQuery will occupy the global "jquery" module ID. This is because jQuery is a special named module.

### jQuery UI

[jQuery UI](http://jqueryui.com/) the newest versions of jQuery UI come pre-configured as a single file. We recommend hitting up the [jquery UI custom download page](http://jqueryui.com/download/) to get your single-file version. The only requirement, is we need to say there's a dependency on jQuery

{% highlight js %}
// First, let's route the "jquery.ui" module to a URL we can manage
Inject.addFileRule(/jquery\.ui/, function(path) {
  return 'jquery/ui/your-jquery-custom.min.js';
});

// Second, let's add a content rule for the jQuery UI file
// this makes jquery a dependency for jQuery UI
Inject.addContentRule(/your-jquery-custom\.min\.js/, function(next, text) {
  next(null, [
    'if (!jQuery) var $ = jQuery = require(\'jquery\');',
    text,
    'module.setExports(jQuery);',
  ''].join('\n'));
});

// remember to also shim jQuery like above in the jQuery example
Inject.addContentRule(/jquery-1\.7\.js/, function(next, text) {
  next(null, [
    'var oldJQ = window.jQuery;',
    text,
    'module.setExports(jQuery.noConflict());',
    'delete window["jQuery"];',
    'window.jQuery = oldJQ;',
  ''].join('\n'));
});
{% endhighlight %}

### Modernizr

[Modernizr](http://modernizr.com/) requires the existence of a document object. Since it traditionally runs in the `window` scope, we need to inform it about `this.document` and associate it with the `window.document` object. We can then assign exports and clean up the window object as required.

{% highlight js %}
Inject.addContentRule(/modernizr/i, function(next, text) {
  next(null, [
    'this.document = window.document;',
    text,
    'module.setExports(window.Modernizr);',
    'delete this["document"]',
    'delete window["Modernizr"];'
  ].join('\n'));
});
{% endhighlight %}

