---
layout: docs
version: 0.6.x
title: Building Inject From Source
category: howto
permalink: /docs/0.6.x/howto/build_from_source.html
---

Want to build your very own copy of Inject? Perhaps you'd like to contribute to the project or maybe just tinker around under the hood. Whatever the reason, these steps will get you started quickly.


### 1. Grab a Copy of the Source

Clone or fork Inject from GitHub:

[https://github.com/linkedin/inject](https://github.com/linkedin/inject)


### 2. Install Dependencies

You'll need to gather a few npm packages and submodules to build and test successfully. Before we begin, install Node.js and npm if you don't have them already:

* [Node.js](http://nodejs.org/)
* [npm](http://npmjs.org/)

Now you can install the required dependencies. Navigate to the root directory and issue this command to install the necessary npm packages. Depending on your environment, you may need `sudo` for your npm installations.

{% highlight sh %}
npm install
npm install -g grunt-cli
{% endhighlight %}

To properly test your Inject build, you'll need to install a few submodules. While still in the root directory, run these commands to pull in the currently supported AMD and CommonJS test suites.

{% highlight sh %}
git submodule init
git submodule update
{% endhighlight %}


### 3. Build

After all the dependencies have been successfully installed, you're ready to build Inject. Simply run this command:

{% highlight sh %}
grunt build
{% endhighlight %}

To customize your build, these options are available:

{% highlight sh %}
# Use a headless PhantomJS server to
# quickly run the unit tests
grunt test
{% endhighlight %}


### 4. Viewing Examples and Testing Your Build

The Inject source package includes a collection of usage examples and a suit of tests that cover Inject-specific integration, the CommonJS specification, and the AMD tests. These can be accessed by starting the server:

{% highlight sh %}
# always build before using the server so you
# have the latest "release" to test against
grunt build server
{% endhighlight %}

Hit http://localhost:4000/tests/ to run the test suite. It's a good idea to run the tests after building to verify your copy is in working order.

Examples are available on the test server at http://localhost:4000/examples/


### 5. Integrating with Travis CI

[Travis-CI](http://travis-ci.org) is a continuous integration server that works with GitHub. Every time you push to "origin", a build can be kicked off to validate your code is working as expected. Set up Travis-CI as follows:

1. Visit http://travis-ci.org in your browser.
2. Sign in with your GitHub credentials and authorize Travis-CI.
3. Visit [your Travis-CI Profile](http://travis-ci.org/profile).
4. If none of your repositories are listed, click "Sync now".
5. In the list of your repositories, flip the on/off switch for *yourname/inject*.
6. Click the wrench to configure your service hook and verify everything looks good (you can use our .travis.yml file).
7. From the settings page, give the "Test Hook" a click. It will kick off a Travis-CI build for you and you can verify things are behaving correctly. Anything comes up, open an issue and we'll try and get things working for you.