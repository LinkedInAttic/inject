var nStatic = require("node-static"),
    path = require("path"),
    http = require("http"),
    sys = require("sys"),
    injectServer = new nStatic.Server(path.normalize("" + __dirname + "/../artifacts/dev")),
    exampleServer = new nStatic.Server(path.normalize("" + __dirname + "/../examples")),
    unitTestingServer = new nStatic.Server(path.normalize("" + __dirname + "/../tests")),
    useServer;

// live demo server
function server(request, response) {
  if (request.url.indexOf("/examples") === 0) {
    useServer = exampleServer;
    request.url = request.url.replace(/^\/examples/, "");
  }
  else if (request.url.indexOf("/tests") === 0) {
    useServer = unitTestingServer;
    request.url = request.url.replace(/^\/tests/, "");
  }
  else {
    useServer = injectServer;
  }
  
  if(request.url === '/deps/jqueryui/jquery.ui.widget.min.js') {
    // delayed server call for the jquery ui example
    return setTimeout(function() {
      exampleServer.serve(request, response, function(err, result) {});
    }, 5000);
  }
  
  if(request.url === '/deps/bar.js') {
    // delayed server call for the jquery ui example
    return setTimeout(function() {
      exampleServer.serve(request, response, function(err, result) {});
    }, 3000);
  }
  
  if(request.url === '/requires/modules-1.1.1/ensure-overlap/multiply.js') {
    // delayed server call for the ensure-overlap unit test in modules 1.1.1 spec
    return setTimeout(function() {
      unitTestingServer.serve(request, response, function(err, result) {});
    }, 300);
  }
  
  if(request.url === '/favicon.ico') {
    // return empty response for favico... keeps the logs clear
    return response.end();
  }
  
  else {
    // normal serving
    injectServer.serve(request, response, function(err, result) {
      if ((err != null ? err.status : void 0) === 404) {
        // serve from mode example
        useServer.serve(request, response, function(err, result) {
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


http.createServer(server).listen(4000);
http.createServer(server).listen(4001);
sys.log("inject() server running on ports 4000 and 4001");
sys.log("-----")
sys.log("access examples: http://localhost:4000/examples/index.html");
sys.log("access tests:    http://localhost:4000/tests/index.html");
