document.getElementById('select-framework').onchange = selectFramework;
document.getElementById('run-tests').onclick = runTests;
var autoRun = (location.search.indexOf('autorun=true') != -1) ? true : false;
var groupings = {};

if (implemented) {
  // tag valid tests as testable
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

function selectFramework() {
  var qstr = '?framework=' + document.getElementById('select-framework').value;
  location.href = location.pathname + qstr;
}

function runTests() {
  document.getElementById('run-tests').disabled = true;
  
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
  for (i = 0, len = nodes.length; i < len; i++) {
    link = nodes[i];
    parent = link.parentNode;
    testable = parent.className.indexOf('testable') >= 0;
    if (testable) {
      if (parent.getElementsByTagName('div')[0]) {
        parent.removeChild(parent.getElementsByTagName('div')[0]);
      }
      iframe = document.createElement('iframe');
      iframe.src = link.href;
      parent.insertBefore(iframe, link);
    }
  }
}

var amdJS = amdJS || {};

function testAllDone() {
  var done = true;
  var failed = false;
  var groups = 0;
  var totalGroups = document.getElementsByTagName('iframe').length;
  for (var name in groupings) {
    if (groupings.hasOwnProperty(name)) {
      groups++;
      if (!groupings[name].done) {
        done = false;
      }
      if (groupings[name].fail > 0) {
        failed = true;
      }
    }
  }

  if (!done || groups < totalGroups) {
    return;
  }

  var out = document.getElementById('results');
  if (!out) {
    out = document.createElement('div');
    out.id = 'results';
    out.style.visibility = 'hidden';
    document.body.appendChild(out);
    console.log('AMDJS ' + ((failed) ? 'FAIL' : 'PASS'));
  }
  out.innerHTML = (failed) ? 'FAIL' : 'PASS';
}

amdJS.print = function(message) {
  var pieces = message.match(/^(.+?)[\s]+\((.+?)\)(.*)$/) || [];
  var type = pieces[1].toLowerCase(),
      group = pieces[2],
      msg = pieces[3];
  console.log(message);

  switch (type) {
    case 'start':
      groupings[group] = {
        pass: 0,
        fail: 0,
        total: 0,
        done: false
      }
      break;
    case 'pass':
      groupings[group].pass++;
      groupings[group].total++;
      break;
    case 'fail':
      groupings[group].fail++;
      groupings[group].total++;
      break;
    case 'done':
      groupings[group].done = true;
      testAllDone();
      break;
  }
};

if (autoRun) {
  window.setTimeout(function() {
    runTests();
  }, 10);
}