---
layout: api
version: 0.4.x
title: Inject.addRule
injectOnly: true
signature: Inject.addRule(match, options)
---

{% highlight js %}
Inject.addRule(/regexMatch/?, weight?, { /* options */ });
Inject.addRule('string'?, weight?, { /* options */ });
Inject.addRule(/regexMatch/?, { /* options */ });
Inject.addRule('string'?, { /* options */ });
{% endhighlight %}

Sometimes, you need to modify the module you are downloading. `Inject.addRule` enable you to map a module to a new location, modify the contents of the file on the fly, add dependencies, or assign module exports.

Modules are assigned a weighted order, with LIFO (last-in-first-out). Why? Because 9/10 times your rules you add later are to override previous work. As of this doc, the other 1/10 times could benefit from a better matching statement.

The simplest use of Inject.addRule is to change the location of a specific module

{% highlight js %}
Inject.addRule('module/path', {
  path: 'http://example.com/absolute/or/relative.js'
});
{% endhighlight %}

Full details on the options are below.

Rule Matching: options.matches
==============================
Either the first paramter to `addRule` can be a string or regex, or this can be assigned to the ruleSet's `options.matches` value. When the match condition is met, the rule is applied. Strings match a literal 1:1 while regexes match based on standard JavaScript regex objects. The rest of the options only take effect if the match resolves to `true`.

Path Mapping: options.path
==========================
The `options.path` parameter is either a string or a function. When path is a string, a 1:1 replacement is made when the match is satisfied. When path is a function, it is invoked, receiving the current working path as a parameter for modification. For example, you can mount jQuery to a specific URL

{% highlight js %}
Inject.addRule(/^jquery$/, {
  path: '/path/to/jquery-1.8.2.min.js'
});
{% endhighlight %}

or you can capture jquery ui components and mount those based on their naming convention

{% highlight js %}
Inject.addRule(/^jquery\.ui\..+$/, {
  path: function (path) {
  	// sample: jquery.ui.button
  	var pieces = path.split('.');
  	pieces.shift(); // remove jquery
  	pieces.shift(); // remove ui

  	// that leaves just the jquery ui module
  	return '/path/to/jqueryui/' + pieces.join('.') + '.js';
  }
});
{% endhighlight %}

Whatever string is returned from the `path` function will become the new path.

Controlling Order: options.weight and options.last
==================================================
The `options.weight` is an Integer value used to increase the priority of a rule. By default, rules are applied in a LIFO (last-in-first-out) manner. If you want a rule to "stick", you can assign it a higher weight. Consider the contrived example

{% highlight js %}
Inject.addRule(/^.+$/ {
  path: 'foo',
  weight: 100
});

Inject.addRule(/^.+$/ {
  path: 'bar'
});
{% endhighlight %}

The above will result in a resolution to "bar". The default order would have been `bar` then `foo`, ultimately replacing everything with "foo". However, the new weights put foo in position to resolve first, making the rule stick at the front.

The `options.last` tells Inject that no more rules should run after this. Coupled with `options.weight`, it's a very effective way to stop a rules queue if required. An alternative syntax lets you specify weight in the method signature itself.

Controlling Automated Adjustment: options.useSuffix
===================================================
Unless disabled as part of [Inject.setUseSuffix](/docs/0.4.x/api/inject.setusesuffix.html), `options.useSuffix` allows a specific rule to disable the automatic suffix injection. If set to `false` explicitly, a ".js" suffix will be omitted.

Altering the File: options.pointcuts
====================================
`options.pointcuts` provides a way to modify the file after its download, but before execution. **This enables you to alter a file to add require statements, assign module exports, and more without altering the original file**. This "shimming" process is one of Inject's biggest uses. There's a [list of receipies](/docs/0.4.x/howto/inject_and_libraries.html) that demonstrate how to use pointcuts.

The before pointcut `options.pointcuts.before` (deprecated 0.4.1) and after pointcut `options.pointcuts.after` (deprecated 0.4.1) can be used to add function code before and after the file

{% highlight js %}
Inject.addRule(/regex/, {
  pointcuts: {
    before: function () {
      // this code is injected before...
      var foo = 7;
    },
    after: function () {
      // this code is injected after...
      module.exports = window.Foo;
    }
  }
});
{% endhighlight %}

The after pointcut `options.pointcuts.afterFetch` (available 0.4.1) allow asynchronous manipulation of the file. The afterFetch pointcut takes a function with 4 parameters:

* next - a function that passes control to the next function, call as next(err, newText)
* text - the incoming text from previous afterFetch calls
* moduleName - the name of the currently executing module
* requestorName - the name of the module who made this request (parent module)

{% highlight js %}
Inject.addRule(/regex/, {
  pointcuts: {
    afterFetch: function (next, text, moduleName, requestorName) {
      // modify "text" however you would like. When complete, call
      // next(null, result) for success
      // next(error) for failure
      next(null, text);
    }
  }
});
{% endhighlight %}

If you add additional `require()` statements using afterFetch, they will be added as dependencies. This makes it very easy to support things like JQuery UI and Dust Plugins.