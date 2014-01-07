var manifest = require('./manifest');
var remaining = 0;
var failures = 0;
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var phantomTmpl = 'phantomjs server/phantom-runner.js {FRAMEWORK} http://localhost:4000/?framework={FRAMEWORK}\\&autorun=true';
var runCmd = '';

for (var name in manifest.manifest) {
  remaining++;
  runCmd = phantomTmpl.replace(/\{FRAMEWORK\}/g, name);
  exec(runCmd, {timeout: 10000}, function (error, stdout, stderr) {
    if (error) {
      failures++;
    }

    console.warn(stdout);

    remaining--;
    if (!remaining) {
      if (failures) {
        console.warn('test suite failed');
        process.exit(1);
      }
      else {
        console.warn('test suite passes');
        process.exit(0);
      }
    }
  });
}

