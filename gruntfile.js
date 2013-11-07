// gruntfile
var path = require('path');

module.exports = function (grunt) {

  // a generic config object used for dynamic filename assignment
  var cfg = {};

  // generates a filename based on target and task
  function genFileName(target, task) {
    return './tmp/' + target + '_' + task + '_out.js';
  }

  // the workhorse of the grunt file
  grunt.initConfig({
    // inject specific header
    inject_header: grunt.file.read('./src/includes/copyright-lic-min.js'),

    // we use a special header/footer instead of the normal
    // grunt anonymize
    anonymous_header: '!(function(context, undefined){\n',
    anonymous_footer: '\n;context.Inject.version = "__INJECT__VERSION__";\n})(this);',
    relay_html_header: '<!DOCTYPE html>\n<html><head>\n<script type="text/javascript">',
    relay_html_footer: '\n</script>\n</body>\n</html>',

    // these are the possible output files when done
    output_files: {
      main:         './artifacts/inject-__INJECT__VERSION__/inject.js',
      main_min:     './artifacts/inject-__INJECT__VERSION__/inject.min.js',
      plugins:      './artifacts/inject-__INJECT__VERSION__/inject-plugins.js',
      plugins_min:  './artifacts/inject-__INJECT__VERSION__/inject-plugins.min.js',
      license:      './artifacts/inject-__INJECT__VERSION__/LICENSE',
      readme:       './artifacts/inject-__INJECT__VERSION__/README.markdown',
      relayHtml:    './artifacts/inject-__INJECT__VERSION__/relay.html'
    },

    zip_locations: {
      archive:      'inject-__INJECT__VERSION__.tgz',
      path:         'inject-__INJECT__VERSION__'
    },

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
     * shell: run shell commands. We use this for git ops
     */
    shell: {
      tag: {
        command: 'git describe HEAD',
        options: {
          callback: function (err, stdout, stderr, next) {
            var foot = grunt.config.get('anonymous_footer');
            var output_files = grunt.config.get('output_files');
            var zip_locations = grunt.config.get('zip_locations');
            var version = stdout.replace(/[\s]/g, '');
            var file;
            var type;

            function addVersion(str) {
              return str.replace(/__INJECT__VERSION__/g, version);
            }

            // set the inject version everywhere we need to
            grunt.config.set('anonymous_footer', addVersion(foot));
            for (type in output_files) {
              file = grunt.config.get('output_files.'+type);
              grunt.config.set('output_files.'+type, addVersion(file));
            }
            for (type in zip_locations) {
              file = grunt.config.get('zip_locations.'+type);
              grunt.config.set('zip_locations.'+type, addVersion(file));
            }

            next();
          }
        }
      }
    },

    /**
     * copy: copy files that need no modification
     */
    copy: {
      main: {
        files: [
          {src: [genFileName('concat', 'main')], dest: '<%= output_files.main %>', filter: 'isFile'},
          {src: [genFileName('uglify', 'main')], dest: '<%= output_files.main_min %>', filter: 'isFile'}
        ]
      },
      plugins: {
        files: [
          {src: [genFileName('concat', 'plugins')], dest: '<%= output_files.plugins %>', filter: 'isFile'},
          {src: [genFileName('uglify', 'plugins')], dest: '<%= output_files.plugins_min %>', filter: 'isFile'}
        ]
      },
      legalish: {
        files: [
          {src: ['./LICENSE'], dest: '<%= output_files.license %>', filter: 'isFile'},
          {src: ['./README.markdown'], dest: '<%= output_files.readme %>', filter: 'isFile'}
        ]
      },
      xd: {
        files: [
          {src: [genFileName('concat', 'relayHtml')], dest: '<%= output_files.relayHtml %>', filter: 'isFile'}
        ]
      }
    },

    /**
     * jshint: perform jshint operations on the code base
     */
    jshint: {
      all: {
        files: {
          src: [
            './gruntfile.js',
            './src/*.js',
            './src/compat/localstorage-shim.js',
            './src/includes/*.js',
            './src/plugins/*.js',
            './src/xd/*.js'
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
          except: ['require', 'define', 'easyxdm', 'localstorage', 'undefined']
        }
      },
      main: {
        files: {} // placeholder
      },
      plugins: {
        files: {} // placeholder
      }
    },

    /**
     * concat: build a payload, putting together source files
     */
    concat: {
      options: {
        separator: ';',
        banner: '<%= inject_header %>\n<%= anonymous_header %>',
        footer: '<%= anonymous_footer %>'
      },
      main: {
        dest: '', // placeholder
        options: {
          separator: ';'
        },
        src: [
          './src/includes/constants.js',
          './src/includes/globals.js',
          './src/includes/commonjs.js',
          './src/lib/fiber.js',
          './src/lib/fiber.post.js',
          './src/lib/flow.js',
          './src/lib/lscache.js',
          './src/lib/lscache.post.js',
          './src/xd/postmessage.js',
          './src/analyzer.js',
          './src/communicator.js',
          './src/executor.js',
          './src/injectcore.js',
          './src/requirecontext.js',
          './src/rulesengine.js',
          './src/treerunner.js',
          './src/treenode.js',
          './src/includes/context.js'
        ]
      },
      plugins: {
        dest: '', // placeholder
        options: {
          separator: ';',
          banner: '',
          footer: ''
        },
        src: [
          './src/plugins/css.js',
          './src/plugins/text.js',
          './src/plugins/json.js'
        ]
      },
      relayHtml: {
        dest: '', // placeholder
        options: {
          separator: '\n',
          banner: '<%= relay_html_header %>\n<%= inject_header %>\n',
          footer: '<%= relay_html_footer %>'
        },
        src: [
          './src/lib/lscache.js',
          './src/xd/postmessage.js',
          './src/xd/relay.js'
        ]
      }
    },

    /**
     * qunit: runs our test suite via phantomjs
     */
    qunit: {
      all: {
        options: {
          timeout: 20000,
          urls: [
            'http://localhost:4000/tests/index.html'
          ]
        }
      }
    },

    /**
     * express: run our express server for handling tests and examples
     */
    express: {
      generic: {
        options: {
          port: 4000,
          server: path.resolve('./server.js')
        }
      },
      alternate: {
        options: {
          port: 4001,
          server: path.resolve('./server.js')
        }
      }
    },

    log: {
      server: {
        options: {
          message: [
            '',
            'SERVER RUNNING:',
            'examples: http://localhost:4000/examples',
            'tests: http://localhost:4000/tests',
            '',
            'an identical server is running on port 4001 for cross-domain',
            'simulation in examples'
          ].join('\n')
        }
      }
    },

    compress: {
      release: {
        options: {
          archive: './artifacts/<%= zip_locations.archive %>',
          pretty: true
        },
        files: [
          {
            src: '**',
            dest: '/',
            expand: true,
            filter: 'isFile',
            cwd: 'artifacts/<%= zip_locations.path %>/'
          }
        ]
      }
    }
  });

  // dynamic assignments
  cfg = {};
  cfg[genFileName('uglify', 'main')] = genFileName('concat', 'main');
  grunt.config.set('uglify.main.files', cfg);

  cfg = {};
  cfg[genFileName('uglify', 'plugins')] = genFileName('concat', 'plugins');
  grunt.config.set('uglify.plugins.files', cfg);

  grunt.config.set('concat.main.dest', genFileName('concat', 'main'));
  grunt.config.set('concat.noxd.dest', genFileName('concat', 'noxd'));
  grunt.config.set('concat.plugins.dest', genFileName('concat', 'plugins'));
  grunt.config.set('concat.relayHtml.dest', genFileName('concat', 'relayHtml'));

  // load NPM tasks
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-compress');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-qunit');
  grunt.loadNpmTasks('grunt-contrib-compress');
  grunt.loadNpmTasks('grunt-shell');
  grunt.loadNpmTasks('grunt-express');
  
  grunt.registerMultiTask('log', 'Print some messages', function() {
    grunt.log.writeln(this.data.options.message);
  });

  // set up grunt task options
  grunt.registerTask('build', ['default']);
  grunt.registerTask('default', [
    'jshint',
    'shell:tag',

    'concat:main',
    'uglify:main',
    'copy:main',

    'concat:plugins',
    'uglify:plugins',
    'copy:plugins',

    'copy:legalish',
    'concat:relayHtml',
    'copy:xd',

    'clean:tmp'
  ]);

  grunt.registerTask('test', [
    'express:generic',
    'express:alternate',
    'qunit',
    'express-stop'
  ]);

  grunt.registerTask('server', [
    'express:generic',
    'express:alternate',
    'log:server',
    'express-keepalive'
  ]);

  grunt.registerTask('release', [
    'build',
    'compress:release'
  ]);

};