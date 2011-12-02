var nStatic = require("node-static"),
    path = require("path"),
    http = require("http"),
    sys = require("sys"),
    injectServer = new nStatic.Server(path.normalize("" + __dirname + "/../artifacts/dev")),
    exampleServer = new nStatic.Server(path.normalize("" + __dirname + "/../examples"));
    unitTestingServer = new nStatic.Server(path.normalize("" + __dirname + "/../tests"));

// live demo server
function server(request, response) {
  // serve from inject
  if(request.url === '/deps/jqueryui/jquery.ui.widget.min.js') {
    return setTimeout(function() {
      exampleServer.serve(request, response, function(err, result) {});
    }, 5000);
  }
  else {
    injectServer.serve(request, response, function(err, result) {
      if ((err != null ? err.status : void 0) === 404) {
        // serve from example
        exampleServer.serve(request, response, function(err, result) {
          if ((err != null ? err.status : void 0) === 404) {
            // not found in either static
            sys.error("Error serving " + request.url + " - " + request.message);
            response.writeHead(err.status, err.headers);
            return response.end();
          }
        });
      }
    });
  }
}


// unit test server
function unitTestServer(request, response) {
  injectServer.serve(request, response, function(err, result) {
    if ((err != null ? err.status : void 0) === 404) {
      // serve from unittest
      unitTestingServer.serve(request, response, function(err, result) {
        if ((err != null ? err.status : void 0) === 404) {
          // not found in either static
          sys.error("Error serving " + request.url + " - " + request.message);
          response.writeHead(err.status, err.headers);
          return response.end();
        }
      });
    }
  });
}


http.createServer(server).listen(4000);
http.createServer(server).listen(4001);
sys.log("inject() examples running on ports 4000 and 4001");

http.createServer(unitTestServer).listen(4004);
http.createServer(unitTestServer).listen(4005);
sys.log("inject() unit tests running on ports 4004 and 4005");
sys.log("-----")
sys.log("access examples: http://localhost:4000/index.html");
sys.log("access tests:    http://localhost:4004/index.html");
