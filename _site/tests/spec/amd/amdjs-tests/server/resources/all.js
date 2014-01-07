/*
ABOUT THIS FILE
===============
This file is the JS driver for the test running interface. Its main purpose
is selecting a test from the suite list, performing the "runTests" operation,
and reporting back for the sake of its own Travis-CI runner.

On boot, it tags tests as valid based on the window.implemented from a
framework's test config.

The global amdJSSignal object will listen for a failure and flag tests
as failed or complete.

Finally, calling a framework with &autorun=true will start the tests
automatically, again for Travis-CI.
*/

(function() {

  // autoRun based on url parameters, triggers automatic run of the test
  // suite
  var autoRun = (location.search.indexOf('autorun=true') != -1) ? true : false;

  // a collection of test passes and fails, grouped by their test identifier
  var groupings = {};

  // how many tests are we expecting to complete. Determined at runTests time
  var expectedDone = 0;

  // have any of the tests failed
  var failed = false;

  // a node to contain the result ID for travis
  var travisResult = document.createElement('div');
  travisResult.id = 'travis-results';

  // a global timeout for the AMD system (ms)
  var globalAMDTimeout = 20000;

  // holds the window timeout object to be cancelled when tests are done
  var globalTimeout;

  // tag valid tests as testable
  // we give it a "testable" class. We then add a bunch of
  // pending DIVs until test execution fires
  // this helps an end user visualize which tests will be
  // executed
  if (window.implemented) {
    for (impl in implemented) {
      nodes = document.getElementsByClassName(impl);
      for (i = 0, len = nodes.length; i < len; i++) {
        nodes[i].className += ' testable';
        iframe = document.createElement('div');
        iframe.className = 'skipped';
        nodes[i].insertBefore(iframe, nodes[i].firstChild);
      }
    }
  }

  // selects a framework and reloads the page, enabling that framework
  function selectFramework() {
    var qstr = '?framework=' + document.getElementById('select-framework').value;
    location.href = location.pathname + qstr;
  }

  // runs the test collection
  // 1. start a timer
  // 2. find all the tests that are flagged "testable"
  // 3. add to the # of expected tests
  // 4. create an iframe to house the test based on the <a> tag
  // 5. drop the iframe in where the div was previously
  function runTests() {
    document.getElementById('run-tests').disabled = true;

    globalTimeout = window.setTimeout(function() {
      failed = true;
      travisResult.innerHTML = 'fail';
      document.body.appendChild(travisResult);
    }, globalAMDTimeout);
    
    var using = (implemented) ? implemented : {}; // global
    var nodes;
    var impl;
    var i;
    var len;
    var link;
    var parent;
    var testable;
    var iframe;

    groupings = {};
    nodes = [].slice.apply(document.getElementById('tests').getElementsByTagName('a'));
    failed = false;

    for (i = 0, len = nodes.length; i < len; i++) {
      link = nodes[i];
      parent = link.parentNode;
      testable = parent.className.indexOf('testable') >= 0;
      if (testable) {
        expectedDone++;
        if (parent.getElementsByTagName('div')[0]) {
          parent.removeChild(parent.getElementsByTagName('div')[0]);
        }
        iframe = document.createElement('iframe');
        iframe.src = link.href;
        parent.insertBefore(iframe, link);
      }
    }
  }

  // handle the explcit AMD signalling infrastructure.
  // our reporter (in individual test files) is bridged to invoke 
  // window.top.amdJSSignal.*, with pass(), fail(), and done()
  // methods. We use this for travis signalling
  window.amdJSSignal = {
    fail: function() {
      failed = true;
      travisResult.innerHTML = 'fail';
      document.body.appendChild(travisResult);
    },
    done: function() {
      expectedDone--;
      if (expectedDone <= 0 && !failed) {
        window.clearTimeout(globalTimeout);
        travisResult.innerHTML = 'pass';
        document.body.appendChild(travisResult);
      }
    }
  };

  document.getElementById('run-tests').removeAttribute('disabled');

  // do an autorun if enabled by query string
  if (autoRun) {
    window.setTimeout(function() {
      runTests();
    }, 10);
  }

  // add very simple low level event listeners
  document.getElementById('select-framework').onchange = selectFramework;
  document.getElementById('run-tests').onclick = runTests;

})();