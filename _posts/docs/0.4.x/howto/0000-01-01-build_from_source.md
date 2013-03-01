---
layout: docs
title: Building Inject From Source
category: howto
version: 0.4.x
asOf: 0.4.1
injectOnly: true
permalink: /docs/0.4.x/api/inject.plugin.html
published: false
---

## Building Inject

Want to build your very own copy of Inject? Perhaps you'd like to contribute to the project or maybe just tinker around under the hood. Whatever the case may be, the following steps will get you started quickly.


### 1. Grab a copy of the source.

Clone or fork Inject from GitHub:

[https://github.com/linkedin/inject](https://github.com/linkedin/inject)


### 2. Install dependencies.

You'll need to grab a few npm packages and submodules to build and test successfully. Before we begin, install Node.js and npm if you don't have them already:

* [Node.js](http://nodejs.org/)
* [npm](http://npmjs.org/)

Now you can install the required dependencies. Navigate to the root directory and issue this command to install the necessary npm packages:

{% highlight sh %}
npm install
{% endhighlight %}

To properly test your Inject build, you'll need to install a few submodules. While still in the root directory:

{% highlight sh %}
git submodule init
git submodule update
{% endhighlight %}


### 3. Build!

After all the dependencies have been successfully installed, you're ready to build Inject. Simply run this command:

{% highlight sh %}
node makefile.js build
{% endhighlight %}

To customize your build, these options are available:

{% highlight sh %}
--noxd
Disables cross domain support (default is *false*)

--nolegacy
Disables ie7 support (default is *false*)

--output
Set an output directory (default is *./artifacts*)
{% endhighlight %}


### 4. Viewing examples and testing your build.

The Inject source package includes a collection of usage examples and a suit of tests that cover Inject-specific integration, the CommonJS specification, and the AMD tests. These can be accessed by starting the server:

{% highlight sh %}
node makefile.js server
{% endhighlight %}

Hit *http://localhost:4000/tests/* to run the test suite. It's a good idea to run the tests after building to verify your copy is in working order.


### 5. Integrating with Travis CI.

[Travis-CI](http://travis-ci.org) is a continuous integration server that works with GitHub. Every time you push to "origin", a build can be kicked off to validate your code is working as expected. Set up Travis-CI as follows:

1. Visit http://travis-ci.org in your browser.
2. Sign in with your GitHub credentials and authorize Travis-CI.
3. Visit [your Travis-CI Profile](http://travis-ci.org/profile).
4. If none of your repositories are listed, click "Sync now".
5. In the list of your repositories, flip the on/off switch for *yourname/inject*.
6. Click the wrench to configure your service hook and verify everything looks good (you can use our .travis.yml file).
7. From the settings page, give the "Test Hook" a click. It will kick off a Travis-CI build for you and you can verify things are behaving correctly. Anything comes up, open an issue and we'll try and get things working for you.




****************************
QUESTIONS:
1. What does "node makefile.js all" do? It appears to reference "build".
2. Do any of the options work? When I attempt them, the output still includes everything.

getting jekyll up

****************************
MY NOTES!!!

Steps:
1. Clone the repository:
	git clone https://github.com/linkedin/inject.git
	
		-rw-r--r--   1 kmikles  staff   299 Feb 26 14:56 AUTHORS
		-rw-r--r--   1 kmikles  staff  2065 Feb 26 14:56 LICENSE
		-rw-r--r--   1 kmikles  staff  4927 Feb 26 14:56 README.markdown
		drwxr-xr-x   6 kmikles  staff   204 Feb 26 14:56 build_tasks
		drwxr-xr-x  16 kmikles  staff   544 Feb 26 14:56 examples
		-rw-r--r--   1 kmikles  staff  1172 Feb 26 14:56 makefile.js
		-rw-r--r--   1 kmikles  staff  1126 Feb 26 14:56 package.json
		drwxr-xr-x  15 kmikles  staff   510 Feb 26 14:56 src
		drwxr-xr-x   7 kmikles  staff   238 Feb 26 14:56 tests
	
	

2. Install dependencies:
	npm install
	- Prereqs:
		- node
		- npm
		
		-rw-r--r--   1 kmikles  staff   299 Feb 26 14:56 AUTHORS
		-rw-r--r--   1 kmikles  staff  2065 Feb 26 14:56 LICENSE
		-rw-r--r--   1 kmikles  staff  4927 Feb 26 14:56 README.markdown
		drwxr-xr-x   6 kmikles  staff   204 Feb 26 14:56 build_tasks
		drwxr-xr-x  16 kmikles  staff   544 Feb 26 14:56 examples
		-rw-r--r--   1 kmikles  staff  1172 Feb 26 14:56 makefile.js
	*	drwxr-xr-x  10 kmikles  staff   340 Feb 26 15:04 node_modules
		-rw-r--r--   1 kmikles  staff  1126 Feb 26 14:56 package.json
		drwxr-xr-x  15 kmikles  staff   510 Feb 26 14:56 src
		drwxr-xr-x   7 kmikles  staff   238 Feb 26 14:56 tests
		
		
		
2.5 Install dependencies for testing:
	git submodule init
	git submodule update
	
	Cloning into 'tests/spec/amd/amdjs-tests'...
	remote: Counting objects: 468, done.
	remote: Compressing objects: 100% (276/276), done.
	remote: Total 468 (delta 159), reused 429 (delta 124)
	Receiving objects: 100% (468/468), 233.21 KiB | 95 KiB/s, done.
	Resolving deltas: 100% (159/159), done.
	Submodule path 'tests/spec/amd/amdjs-tests': checked out '561ca7a017d8ee2ec1e383e574840bb485a8f3e6'
	Cloning into 'tests/spec/cjs/interoperablejs'...
	remote: Counting objects: 448, done.
	remote: Compressing objects: 100% (257/257), done.
	remote: Total 448 (delta 169), reused 448 (delta 169)
	Receiving objects: 100% (448/448), 46.36 KiB, done.
	Resolving deltas: 100% (169/169), done.
	Submodule path 'tests/spec/cjs/interoperablejs': checked out '2a8e77e73a05fb5e90618afa8da35d91346492e2'
		
		
		
3. Build Inject:
	node makefile.js build
	- What does "all" do? It looks the same in the code.
	- Actually, do any of the build options work?
	
		-rw-r--r--   1 kmikles  staff   299 Feb 26 14:56 AUTHORS
		-rw-r--r--   1 kmikles  staff  2065 Feb 26 14:56 LICENSE
		-rw-r--r--   1 kmikles  staff  4927 Feb 26 14:56 README.markdown
	*	drwxr-xr-x   3 kmikles  staff   102 Feb 26 15:08 artifacts
		drwxr-xr-x   6 kmikles  staff   204 Feb 26 14:56 build_tasks
		drwxr-xr-x  16 kmikles  staff   544 Feb 26 14:56 examples
		-rw-r--r--   1 kmikles  staff  1172 Feb 26 14:56 makefile.js
	*	drwxr-xr-x  10 kmikles  staff   340 Feb 26 15:04 node_modules
		-rw-r--r--   1 kmikles  staff  1126 Feb 26 14:56 package.json
		drwxr-xr-x  15 kmikles  staff   510 Feb 26 14:56 src
		drwxr-xr-x   7 kmikles  staff   238 Feb 26 14:56 tests
	
	

4. Verify Everything is Cool:	
	node makefile.js server
	
	
	
4.5 Travis

-1. Visit http://travis-ci.org in your browser

-2. Sign in with your GitHub credentials and authorize Travis-CI

-3. Visit [your Travis-CI Profile](http://travis-ci.org/profile)

-3.5 If none of your repositories are listed, click "Sync now".

-4. In the list of your repositories, flip the on/off switch for *yourname/inject*	

-5. Click the wrench to configure your service hook and verify everything looks good (you can use our .travis.yml file)	

-6. From the settings page, give the "Test Hook" a click. It will kick off a Travis-CI build for you and you can verify things are behaving correctly. Anything comes up, open an issue and we'll try and get things working for you.
	- What is supposed to happen here? I click the button and get this message: "Payload deployed". Did it work?
	
	





****************************
