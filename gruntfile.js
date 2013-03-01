// gruntfile

module.exports = function (grunt) {

  // a generic config object used for dynamic filename assignment
  var cfg = {};

  // generates a filename based on target and task
  function genFileName(target, task) {
    return './tmp/' + target + '_' + task + '_out.js';
  }

  grunt.initConfig({
    // inject specific variables
    inject_header: grunt.file.read('./src/includes/copyright-lic-min.js'),
    anonymous_header: '!(function(context, undefined){',
    anonymous_footer: '})(this);',

    // normal grunt reading
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
        banner: '<%= inject_header %>\n',
        mangle: {
          except: ['require', 'define', 'easyxdm', 'localstorage']
        }
      },
      main: {
        files: {} // placeholder
      },
      noxd: {
        files: {} // placeholder
      }
    },

    /**
     * concat: build a payload, putting together source files
     */
    concat: {
      options: {
        separator: ';'
      },
      main: {
        dest: '', // placeholder
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
        ]
      },
      noxd: {
        dest: '', // placeholder
        src: [
          './src/includes/constants.js',
          './src/includes/globals.js',
          './src/includes/commonjs.js',
          './src/lib/fiber.js',
          './src/lib/link.js',
          './src/lib/flow.js',
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
        ]
      }
    }
  });

  // dynamic assignments
  cfg = {};
  cfg[genFileName('uglify', 'main')] = genFileName('concat', 'main');
  grunt.config.set('uglify.main.files', cfg);

  cfg = {};
  cfg[genFileName('uglify', 'noxd')] = genFileName('concat', 'noxd');
  grunt.config.set('uglify.noxd.files', cfg);

  grunt.config.set('concat.main.dest', genFileName('concat', 'main'));
  grunt.config.set('concat.noxd.dest', genFileName('concat', 'noxd'));

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
    'concat:main',
    'uglify:main'
  ]);

  grunt.registerTask('noxd', [
    'jshint',
    'concat:noxd',
    'uglify:noxd'
  ]);

};