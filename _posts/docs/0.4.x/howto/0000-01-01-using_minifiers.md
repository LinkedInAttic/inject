---
layout: docs
version: 0.4.x
title: Using Minifiers
category: howto
permalink: /docs/0.4.x/howto/using_minifiers.html
---

If you're using a JS Minifier for your module files (and you probably should), there are some important compilation options you need. Many minifiers obfuscate and optimize variables inside of functions, which will affect the ability of inject to identify your dependencies before runtime. For the greatest in-browser optimization, we recommend using [UglifyJS](https://github.com/mishoo/UglifyJS) since it allows you to protect specific reserved names while still mazimixing the amount of compression you can do. If running node isn't an option, YUI and Google compressors can also be used with the following options:

* UglifyJS: `--reserved-names “require,exports,module"`
* YUI Compressor: `--nomunge`
* Google Closure: `--compilation_level WHITESPACE_ONLY`

If your compression engine of choice isn't on the list, and has the ability to protect/preserve certain names, send us a bug with the settings and we'll add it to the list. As a last ditch effort, you can often put an `eval();` after your return statement. For most optimizers, the addition of an eval will prevent variable munging within the current scope chain.