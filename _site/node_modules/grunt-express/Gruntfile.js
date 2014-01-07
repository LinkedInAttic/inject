'use strict';
var path = require('path');

module.exports = function(grunt) {
	grunt.initConfig({
		jshint: {
			all: [
				'Gruntfile.js',
				'tasks/*.js',
				'<%= nodeunit.tests %>'
			],
			options: {
				jshintrc: '.jshintrc'
			}
		},

		nodeunit: {
			tests: ['test/*_test.js']
		},

		express: {
			default_option: {},
			custom_base: {
				options: {
					port: 4000,
					bases: 'test'
				}
			},
			custom_bases: {
				options: {
					port: 5000,
					bases: ['test', 'test/fixtures2']
				}
			},
			custom_express: {
				options: {
					port: 7000,
					server: path.resolve('./test/fixtures/server')
				}
			},
		}
	});

	grunt.loadTasks('tasks');

	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-nodeunit');
	grunt.loadNpmTasks('grunt-contrib-internal');

	grunt.registerTask('test', ['express', 'nodeunit']);
  grunt.registerTask('keepalive', ['express', 'express-keepalive']);
	grunt.registerTask('default', ['jshint', 'test']);
};
