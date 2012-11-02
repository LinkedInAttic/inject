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

function delay(amount) {
  return function(req, res, next) {
    setTimeout(function() {
      next();
    }, amount);
  };
}

app.use('/examples/dependencies/addrule/jqueryui/jquery.ui.widget.min.js', delay(3000));
app.use('/tests/spec/modules-1.1.1/includes/bugs/bug_56_a.js', delay(300));
app.use('/tests/spec/amd/includes/bugs/bug_56_a.js', delay(300));

app.use('/docs', express.static(path.normalize(path.join(__dirname, '../', 'artifacts', 'inject-docs'))));
app.use(express.static(path.normalize(path.join(__dirname, '../'))));
app.use(express.static(path.normalize(path.join(__dirname, '../', 'artifacts', 'inject-dev'))));

exports.task = function() {
  app.listen(4000);
  app.listen(4001);
  util.log("Inject server running on ports 4000 and 4001");
  util.log("-----")
  util.log("access docs:     http://localhost:4000/docs/index.html");
  util.log("access examples: http://localhost:4000/examples/index.html");
  util.log("access tests:    http://localhost:4000/tests/index.html");
};
