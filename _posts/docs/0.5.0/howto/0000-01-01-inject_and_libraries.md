---
layout: docs
version: 0.5.0
title: Using Inject With Your Favorite Library
category: howto
permalink: /docs/0.5.0/howto/inject_and_libraries.html
---

Many libraries can be "shimmed" to work with Inject, even if they don't support a CommonJS or AMD system. These are uses of [Inject.addRule](/docs/0.5.0/api/inject.addrule.html) to change the code within the scope of Inject, while leaving the default library unaltered.

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

### jQuery UI

[jQuery UI](http://jqueryui.com/) requires two changes. The first affects all jQuery UI modules. They all explicitly require jQuery, and then record jQuery as their module.exports. This sharing ensures you can always say `$ = require('jquery.ui.component')` and get a working jQuery object with the plugin loaded. The second `addRule` call enables you to specify dependencies using the same `afterFetch` pointcut. The below example shows how you might specify jQuery and jQuery UI.

{% highlight js %}
// note: weighting is important
Inject.addFileRule(/jquery\.ui/, function(path) {
  return 'jqueryui/' + path + '.min.js';
});

// this generally adjusts all jquery ui files
Inject.addContentRule(/jqueryui\//, function(next, text) {
  next(null, [
    'if (!jQuery) var $ = jQuery = require(\'jquery\');',
    text,
    'module.setExports(jQuery);',
  ''].join('\n'));
}, { weight: 300 });

// this specifically sets up button's dependencies
Inject.addContentRule(/jqueryui\/.*?button/, function(next, text) {
  next(null, [
    'if (!jQuery) var $ = jQuery = require(\'jquery\');',
    'require(\'jquery.ui.core\');',
    'require(\'jquery.ui.widget\');',
    text,
  ''].join('\n'));
}, { weight: 500 });

// jQuery shim
Inject.addFileRule(/^jquery$/, function() {
  return 'jquery-1.7.js';
});
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

