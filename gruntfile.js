// gruntfile

module.exports = function (grunt) {
  grunt.initConfig({
    // inject specific variables
    concat_main_tempfile: './tmp/concat_main_out.js',
    uglify_main_tempfile: './tmp/uglify_main_out.js',
    inject_header: grunt.file.read('./src/includes/copyright-lic-min.js'),
    anonymous_header: '!(function(){',
    anonymous_footer: '})();',

    // normal grunt
    pkg: grunt.file.readJSON('package.json'),

    /**
     * clean: clean up temp and artifact directories
     */
    clean: {
      tmp: ['./tmp'],
      artifacts: ['./artifacts']
    },

    /**
     * jshint: perform jshint operations on the code base
     */
    jshint: {
      all: {
        files: {
          src: [
            './gruntfile.js',
            './src/includes/*.js',
            './src/plugins/*.js',
            './src/*.js'
          ]
        },
        jshintrc: './.jshintrc'
      }
    },

    /**
     * uglify: compress code while preserving key identifiers
     */
    uglify: {
      options: {
        mangle: {
          except: ['require', 'define', 'easyxdm', 'localstorage']
        }
      },
      main: {
        banner: '<%= inject_header %>',
        files: {
          src: '<%= concat_main_tempfile %>',
          dest: '<%= uglify_main_tempfile %>'
        }
      }
    },

    /**
     * concat: build a payload, putting together source files
     */
    concat: {
      main: {
        separator: ';',
        src: [
          './src/includes/constants.js',
          './src/includes/globals.js',
          './src/includes/commonjs.js',
          './src/lib/fiber.js',
          './src/lib/link.js',
          './src/lib/flow.js',
          './src/lib/easyxdm-closure.js',
          './src/lib/easyxdm.js',
          './src/lib/lscache.js',
          './src/includes/environment.js',
          './src/analyzer.js',
          './src/communicator.js',
          './src/executor.js',
          './src/injectcore.js',
          './src/requirecontext.js',
          './src/rulesengine.js',
          './src/treedownloader.js',
          './src/treenode.js',
          './src/includes/context.js'
        ],
        dest: '<%= concat_main_tempfile %>'
      }
    }
  });

  // load NPM tasks
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-compress');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-clean');

  // set up grunt task options
  grunt.registerTask('default', [
    'jshint',
    'concat',
    'uglify'
  ]);

  grunt.log.write(grunt.config.get('concat_main_tempfile'));
};