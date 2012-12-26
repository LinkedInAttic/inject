---
layout: docs
version: 0.4.x
title: Using Inject With Your Favorite Library
category: howto
permalink: /docs/0.4.x/howto/inject_and_libraries.html
---

Many libraries can be "shimmed" to work with Inject, even if they don't support a CommonJS or AMD system. These are uses of [Inject.addRule](/docs/0.4.x/api/inject.addrule.html) to change the code within the scope of Inject, while leaving the default library unaltered.

We're always up for adding more recepies for peoples' favorite libraries.

### jQuery

In [jQuery](http://jquery.com/), we modify the code to assign `jQuery.noConflict()` into `module.exports`.

{% highlight js %}
// <= 0.4.0
Inject.addRule(/^jquery$/, {
  path: '/path/to/jquery.js',
  useSuffix: false,
  pointcuts: {
    after: function () {
      module.exports = jQuery.noConflict();
    }
  }
});

// >= 0.4.1
Inject.addRule(/^jquery$/, {
  path: '/path/to/jquery.js',
  useSuffix: false,
  pointcuts: {
    afterFetch: function (next, text) {
      next(null, [
        text,
        'module.exports = jQuery.noConflict();'
      ].join('\n'));
    }
  }
});
{% endhighlight %}

### jQuery UI

[jQuery UI](http://jqueryui.com/) requires two changes. The first affects all jQuery UI modules. They all explicitly require jQuery, and then record jQuery as their module.exports. This sharing ensures you can always say `$ = require('jquery.ui.component')` and get a working jQuery object with the plugin loaded. The second `addRule` call enables you to specify dependencies using the same `afterFetch` pointcut. The below example shows how you might specify jQuery and jQuery UI.

{% highlight js %}
// this is most effective > 0.4.1
Inject.addRule(/jquery\.ui/, {
  path: function(module) {
    return '/jqueryui/' + module + '.min.js'
  },
  last: true,
  pointcuts: {
    afterFetch: function(next, text) {
      next(null, [
        'var jQuery = require("jquery");',
        text,
        'module.setExports(jQuery);',
      ''].join('\n'));
    }
  }
});

// button depends on core and widget
Inject.addRule(/jquery\.ui\.button/, {
  weight: 500,
  pointcuts: {
    afterFetch: function(next, text) {
      next(null, [
        'require("jquery.ui.core");',
        'require("jquery.ui.widget");',
        text,
      ''].join('\n'));
    }
  }
});
{% endhighlight %}

### Modernizr

[Modernizr](http://modernizr.com/) requires the existence of a document object. Since it traditionally runs in the `window` scope, we need to inform it about `this.document` and associate it with the `window.document` object. We can then assign exports and clean up the window object as required.

{% highlight js %}
// <= 0.4.0
Inject.addRule(/^modernizr$/i, {
  path: "/path/to/modernizr.js",
  pointcuts: {
    // before: localize window.document for sandbox
    before: function() {
      this.document = window.document;
    },
    // after: capture exports as object, delete from global scope
    after: function () {
      module.setExports(window.Modernizr);
      delete window["Modernizr"];
    }
  }
});

// >= 0.4.1
Inject.addRule(/^modernizr$/i, {
  path: "/path/to/modernizr.js",
  pointcuts: {
    afterFetch: function (next, text) {
      next(null, [
        'this.document = window.document;',
        text,
        'module.setExports(window.Modernizr);',
        'delete this["document"]',
        'delete window["Modernizr"];'
      ].join('\n'));
    }
  }
});
{% endhighlight %}

