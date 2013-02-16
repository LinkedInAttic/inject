(function(scope) {
  var amdJS = scope.amdJS || {};
  var lastGroup = null;
  var failed = false;
  var passes = 0;
  var fails = 0;

  amdJS.group = function (group) {
    lastGroup = group;
    amdJS.print('START ('+lastGroup+')');
  };

  amdJS.done = function () {
    var groupString = '';
    if (lastGroup) {
      groupString = '('+lastGroup+') ';
    }

    document.body.style.backgroundColor = (failed) ? 'red' : 'green';
    amdJS.print('INFO ' + groupString + passes + ' passes' ,'info');
    amdJS.print('INFO ' + groupString + fails + ' fails' ,'info');
    amdJS.print('DONE ' + groupString);
  };

  amdJS.assert = function (guard, message) {
    var groupString = '';
    if (lastGroup) {
      groupString = '('+lastGroup+') ';
    }

    if (guard) {
      passes++;
      amdJS.print('PASS ' + groupString + message, 'pass');
    }
    else {
      failed = true;
      fails++;
      amdJS.print('FAIL ' + groupString + message, 'fail');
    }
  };

  amdJS.print = function (message, status) {
    if (window.top !== window) {
      if (window.top.amdJS && window.top.amdJS.print) {
        window.top.amdJS.print(message, status);
      }
    }
    else {
      console.log(message);
    }
  };

  scope.amdJS = amdJS;

})(this);