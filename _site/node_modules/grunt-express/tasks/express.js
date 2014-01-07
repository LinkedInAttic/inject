'use strict';

var util = require('../lib/util');

module.exports = function(grunt) {

	// Nodejs libs.

	// External libs.
	var forever = require('forever-monitor');
	var nopt = require('nopt');
	// var supervisor = require('supervisor');

	var servers = {};

    // make sure all server are taken down when grunt exits.
    process.on('exit', function() {
		grunt.util._.each(servers, function(child) {
			if (child.running) {
				child.child.kill();
			}
		});
	});

	grunt.registerMultiTask('express', 'Start an express web server.', function() {
		var child = servers[this.target];

		if (child && child.running) {
			child.stop();
		}

		// Merge task-specific options with these defaults.
		var options = this.options({
			port: 3000,
			// hostname: 'localhost',
			bases: '.', // string|array of each static folders
			monitor: null,
			debug: false,
			server: null
			// (optional) filepath that points to a module that exports a 'server' object that provides
			// 1. a 'listen' function act like http.Server.listen (which connect.listen does)
			// 2. a 'use' function act like connect.use
		});

		options.debug = grunt.option('debug') || options.debug;
        if (grunt.util._.isArray(options.bases)) {
            options.bases = options.bases.join(',');
        }

        var args = [process.argv[0], process.argv[1], 'express-start'];

        grunt.util._.each(grunt.util._.omit(options, 'monitor'), function(value, key) {
            if (value !== null) {
                args.push('--' + key, value);
            }
        });

        servers[this.target] = child = forever.start(args, grunt.util._.isObject(options.monitor) ? options.monitor : {});

        var done = this.async();
        // wait for server to startup before declaring 'done'
        child.child.stdout.on('data', function(data) {
			if (new RegExp('\\[pid: ' + child.child.pid + '\\][\\n\\r]*$').test(data.toString())) {
				done();
			}
        });
	});

	grunt.registerTask('express-start', 'Child process to start a connect server', function() {
		util.watchActiveModules(function(oldStat, newStat) {
			if (newStat.mtime.getTime() !== oldStat.mtime.getTime()) {
				process.exit(0);
			}
		});

		var options = nopt({
			port: Number,
			hostname: String,
			bases: String,
			debug: Boolean,
			server: [String, null]
		}, {
			port: ['--port'],
			hostname: ['--hostname'],
			bases: ['--bases'],
			debug: ['--debug'],
			server: ['--server']
		}, process.argv, 3);

		util.runServer(grunt, options);
		this.async();
	});

	grunt.registerTask('express-stop', 'Stop a running express server', function() {
		if (this.args.length === 0) {
			this.args = Object.keys(servers);
		}

		grunt.util._.each(this.args, function (target) {
			var child = servers[target];
			if (child.running) {
				child.stop();
			}
		});
	});

	grunt.registerTask('express-restart', 'Restart a running express server', function() {
		if (this.args.length === 0) {
			this.args = Object.keys(servers);
		}

		grunt.util._.each(this.args, function (target) {
			var child = servers[target];
			if (!child) {
				grunt.fatal('Server has not been started yet.');
			} else if (child.running) {
				child.restart();
			} else {
				child.start();
			}
		});
	});

	grunt.registerTask('express-keepalive', 'And async task to keep express server alive', function() {
		this.async();
	});
};