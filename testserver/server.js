var nStatic = require("node-static"),
    path = require("path"),
    http = require("http"),
    sys = require("sys"),
    injectServer = new nStatic.Server(path.normalize("" + __dirname + "/../artifacts/dev")),
    exampleServer = new nStatic.Server(path.normalize("" + __dirname + "/../examples"));

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

http.createServer(server).listen(4000);
http.createServer(server).listen(4001);
sys.log("inject() testserver running on ports 4000 and 4001");
sys.log("http://localhost:4000/index.html");