'use strict';

var fs = require('fs');
var path = require('path');

var connect = require('connect');

exports.watchActiveModules = function(watcher) {
	// hijack each module extension handler, and watch the file
	function injectWatcher(handler) {
		return function (module, filename) {
			fs.watchFile(filename, watcher);
			handler(module, filename);
		};
	}

	for (var ext in require.extensions) {
		var handler = require.extensions[ext];
		require.extensions[ext] = injectWatcher(handler);
	}
};

exports.runServer = function (grunt, options) {
	var middleware = [];
	if (options.bases) {
		options.bases = options.bases.split(',');
		// Connect requires the bases path to be absolute.
		options.bases = grunt.util._.map(options.bases, function(b) {
			return path.resolve(b);
		});

		grunt.util._.each(options.bases, function(b) {
			middleware = middleware.concat([
				// Serve static files.
				connect.static(b),
				// Make empty directories browsable.
				connect.directory(b)
			]);
		});
	}

	// If --debug was specified, enable logging.
	if (options.debug) {
		connect.logger.format('grunt', ('[D] server :method :url :status ' +
						':res[content-length] - :response-time ms').magenta);
		middleware.unshift(connect.logger('grunt'));
	}

	var server;
	if (options.server) {
		try {
			server = require(options.server);
			if (typeof server.listen !== 'function') {
				grunt.fatal('Server should provide a function called "listen" which act as http.Server.listen');
			}
			if (typeof server.use !== 'function') {
				grunt.fatal('Server should provide a function called "use" which act as connect.use');
			}
		} catch (e) {
			grunt.fatal('Server "' + options.server + '" not found');
		}
		for (var i = 0; i < middleware.length; i++) {
			server.use(middleware[i]);
		}
	} else {
		server = connect.apply(null, middleware);
	}

	var args = [options.port, function() {
		grunt.log.writeln('Web server started on port:' + options.port + (options.hostname ? ', hostname: ' + options.hostname : ', no hostname specified') + ' [pid: ' + process.pid + ']');
	}];

	// always default hostname to 'localhost' would prevent access using IP address to work
	if (options.hostname) {
		args.splice(1, options.hostname);
	}

	// Start server.
	server.listen.apply(server, args)
	.on('error', function(err) {
		if (err.code === 'EADDRINUSE') {
			grunt.fatal('Port ' + options.port + ' is already in use by another process.');
		} else {
			grunt.fatal(err);
		}
	});
};