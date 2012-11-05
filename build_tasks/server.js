/*
Inject
Copyright 2011 LinkedIn

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing,
software distributed under the License is distributed on an "AS
IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
express or implied.   See the License for the specific language
governing permissions and limitations under the License.
*/

var path = require("path");
var util = require("util");
var express = require("express");
var app = express();
var amdApp = express();

/**
 * ========== Inject Integrated Test Server
 */

function delay(amount) {
  return function(req, res, next) {
    setTimeout(function() {
      next();
    }, amount);
  };
}

// very special redirects...
app.get('/tests/doh/runner.js', function(req, res) {
  return res.redirect('/tests/spec/amd/amdjs-tests/tests/doh/runner.js');
});
app.get('/tests/doh/_browserRunner.js', function(req, res) {
  return res.redirect('/tests/spec/amd/amdjs-tests/tests/doh/_browserRunner.js');
});
app.get('/tests/spec/amd/amdjs-tests/impl/inject/inject.js', function(req, res) {
  return res.redirect('/inject.js');
});
app.get('/tests/spec/amd/amdjs-tests/impl/inject/config.js', function(req, res) {
  return res.redirect('/tests/spec/amd/amd-config.js');
});
// end "very special" section

app.use('/examples/dependencies/addrule/jqueryui/jquery.ui.widget.min.js', delay(3000));
app.use('/tests/spec/modules-1.1.1/includes/bugs/bug_56_a.js', delay(300));
app.use('/tests/spec/amd/includes/bugs/bug_56_a.js', delay(300));

app.use('/docs', express.static(path.normalize(path.join(__dirname, '../', 'artifacts', 'inject-docs'))));
app.use(express.static(path.normalize(path.join(__dirname, '../'))));
app.use(express.static(path.normalize(path.join(__dirname, '../', 'artifacts', 'inject-dev'))));


/**
 * ========== AMD Standalone Test Server
 */
amdApp.use(express.static(path.normalize(path.join(__dirname, '../', 'tests', 'spec', 'amd', 'amdjs-tests'))));

exports.task = function() {
  app.listen(4000);
  app.listen(4001);

  amdApp.listen(4010);

  util.log("Inject server running on ports 4000 and 4001");
  util.log("-----")
  util.log("access docs:     http://localhost:4000/docs/index.html");
  util.log("access examples: http://localhost:4000/examples/index.html");
  util.log("access tests:    http://localhost:4000/tests/index.html");
  util.log('-----')
  util.log("standalone AMD:  http://localhost:4010/start.html");
};
