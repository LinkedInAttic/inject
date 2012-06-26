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
var path = require("path"),
    http = require("http"),
    util = require("util"),
    paperboy = require("paperboy"),
    serveFromArtifacts = null,
    serveFromExamples = null,
    serveFromTests = null;

// optimist
var optimist = require("optimist")
    .usage("Run the inject example and test server.\nUsage: $0 server")
    .boolean("help")
    .describe("help", "show this message");

// create a static server handler
function createServer(path) {
  return function(req, res) {
    paperboy
    .deliver(path, req, res)
    .addHeader('Expires', 0)
    .error(function(statCode, msg) {
      res.writeHead(statCode, {'Content-Type': 'text/plain'});
      res.end("Error " + statCode);
    })
    .otherwise(function(err) {
      res.writeHead(404, {'Content-Type': 'text/plain'});
      res.end("Error 404: File not found");
    });
  };
}

// three serving locations for this project
serveFromArtifacts = createServer(path.normalize("" + __dirname + "/../artifacts/dev"));
serveFromExamples = createServer(path.normalize("" + __dirname + "/../examples"));
serveFromTests = createServer(path.normalize("" + __dirname + "/../tests"));
serveFromSrc = createServer(path.normalize("" + __dirname + "/../src"));

// live server function, used on multiple ports
function server(request, response) {
  var serve = null,
      options = {};
  
  // select a server to handle this file
  if (request.url.indexOf("/examples") === 0) {
    serve = serveFromExamples;
    request.url = request.url.replace(/^\/examples/, "");
  }
  else if (request.url.indexOf("/tests") === 0) {
    serve = serveFromTests;
    request.url = request.url.replace(/^\/tests/, "");
  }
  else if (request.url.indexOf("/src") === 0) {
    serve = serveFromSrc;
    request.url = request.url.replace(/^\/src/, "");
  }
  else {
    serve = serveFromArtifacts;
  }
  
  if (request.url === '/favicon.ico') {
    // return empty response for favico... keeps the logs clear
    return response.end();
  }
  
  // delayed serving calls
  if (request.url === '/deps/jqueryui/jquery.ui.widget.min.js') {
    // delayed server call for the jquery ui example
    return setTimeout(function() {
      serve(request, response, function(err, result) {});
    }, 5000);
  }
  if (request.url === '/modules-1.1.1/includes/bugs/bug_56_a.js') {
    // delayed server call for the ensure-overlap unit test in modules 1.1.1 spec
    return setTimeout(function() {
      serve(request, response, function(err, result) {});
    }, 300);
  }
  if(request.url === '/amd/includes/original/delay.js') {
    // delayed server call 300 msec for amd ensure overlap unit test in amd
    // originally was 2 seconds, reduced just for rerun sake
    return setTimeout(function() {
      serve(request, response, function(err, result) {});
    }, 300);
  }
  
  // standard serving call
  return serve(request, response);
}

exports.task = function() {
  if (optimist.argv.help) {
    optimist.showHelp();
    return;
  }
  
  http.createServer(server).listen(4000);
  http.createServer(server).listen(4001);
  util.log("inject() server running on ports 4000 and 4001");
  util.log("-----")
  util.log("access examples: http://localhost:4000/examples/index.html");
  util.log("access tests:    http://localhost:4000/tests/index.html");
};