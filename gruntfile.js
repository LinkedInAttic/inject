// gruntfile
var path = require('path');

module.exports = function (grunt) {

  // a generic config object used for dynamic filename assignment
  var cfg = {};
  
  function setVersion(version) {
    var foot = grunt.config.get('anonymous_footer');
    var output_files = grunt.config.get('output_files');
    var zip_locations = grunt.config.get('zip_locations');
    var version_string = grunt.config.get('version_string');
    var file;
    var type;

    function addVersion(str) {
      return str.replace(/__INJECT__VERSION__/g, version);
    }

    // set the inject version everywhere we need to
    grunt.config.set('anonymous_footer', addVersion(foot));
    grunt.config.set('version_string', addVersion(version_string));
    for (type in output_files) {
      file = grunt.config.get('output_files.'+type);
      grunt.config.set('output_files.'+type, addVersion(file));
    }
    for (type in zip_locations) {
      file = grunt.config.get('zip_locations.'+type);
      grunt.config.set('zip_locations.'+type, addVersion(file));
    }
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
    
    version_string: '__INJECT__VERSION__',

    // these are the possible output files when done
    output_files: {
      main:         './dist/recent/inject.js',
      main_min:     './dist/recent/inject.min.js',
      plugins:      './dist/recent/inject-plugins.js',
      plugins_min:  './dist/recent/inject-plugins.min.js',
      license:      './dist/recent/LICENSE',
      readme:       './dist/recent/README.markdown',
      relayHtml:    './dist/recent/relay.html',
      release:      'dist/inject-__INJECT__VERSION__/'
    },

    // what are the zip locations named?
    zip_locations: {
      archive:      'inject-__INJECT__VERSION__.tgz',
      path:         'inject-__INJECT__VERSION__'
    },

    /**
     * clean: clean up temp and artifact directories
     */
    clean: {
      tmp: ['./tmp'],
      artifacts: ['./dist/inject-*']
    },

    /**
     * shell: run shell commands. We use this to get the "tag" for generating temporary releases
     */
    shell: {
      versionFromTag: {
        command: 'git describe HEAD',
        options: {
          callback: function (err, stdout, stderr, next) {
            var version = stdout.replace(/[\s]/g, '');
            setVersion(version);
            next();
          }
        }
      },
      git_add: {
        command: 'git add -A',
        options: {
          callback: function(err, stdout, stderr, next) {
            next();
          }
        }
      },
      git_commit_release: {
        command: 'git commit -m "chore(*): Release of Inject <%= version_string %> (via grunt)"',
        options: {
          callback: function(err, stdout, stderr, next) {
            next();
          }
        }
      },
      git_commit_tag: {
        command: 'get tag -a <%= version_string %> -m "Release <%= version_string %> (via grunt)"',
        options: {
          callback: function(err, stdout, stderr, next) {
            next();
          }
        }
      }
    },

    /**
     * copy: copy files from one place to another
     * we use this both to copy our final files, but to also move items from generic input to
     * generic output locations
     */
    copy: {
      concat_to_uglify: {
        files: {
          // dest: src
          './tmp/uglify.in': './tmp/concat.out'
        }
      },
      uglify_to_final: {
        files: {'./tmp/final.out': './tmp/uglify.out'}
      },
      concat_to_final: {
        files: {'./tmp/final.out': './tmp/concat.out'}
      },
      final_to_main: {
        files: [{src: './tmp/final.out', dest: '<%= output_files.main %>', filter: 'isFile'}]
      },
      final_to_main_min: {
        files: [{src: './tmp/final.out', dest: '<%= output_files.main_min %>', filter: 'isFile'}]
      },
      final_to_plugins: {
        files: [{src: './tmp/final.out', dest: '<%= output_files.plugins %>', filter: 'isFile'}]
      },
      final_to_plugins_min: {
        files: [{src: './tmp/final.out', dest: '<%= output_files.plugins_min %>', filter: 'isFile'}]
      },
      final_to_relay: {
        files: [{src: './tmp/final.out', dest: '<%= output_files.relayHtml %>', filter: 'isFile'}]
      },
      legal_to_legal: {
        files:[
          {src: ['./LICENSE'], dest: '<%= output_files.license %>', filter: 'isFile'},
          {src: ['./README.markdown'], dest: '<%= output_files.readme %>', filter: 'isFile'}
        ]
      },
      recent_to_release: {
        expand: true,
        cwd: 'dist/recent',
        src: '*',
        dest: '<%= output_files.release %>'
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
      file: {
        files: {
          // output: from input
          './tmp/uglify.out': './tmp/uglify.in'
        }
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
        dest: './tmp/concat.out',
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
        dest: './tmp/concat.out',
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
        dest: './tmp/concat.out', // placeholder
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
      },
      release: {
        options: {
          message: [
            '',
            'Release is currently using <%= version_string %>',
            'to release as a specific version, use the --as=[version]',
            'flag.'
          ].join('\n')
        }
      },
      pushInstructions: {
        options: {
          message: [
            '',
            'A release has been made and auto-commited to your current branch. To',
            'push this release, please push this branch upstream, followed by',
            'pushing with the --tags flag.',
            '',
            'Release version: <%= version_string %>'
          ].join('\n');
        }
      }
    },

    compress: {
      release: {
        options: {
          archive: './dist/<%= zip_locations.archive %>',
          pretty: true
        },
        files: [
          {
            src: '**',
            dest: '/',
            expand: true,
            filter: 'isFile',
            cwd: 'dist/<%= zip_locations.path %>/'
          }
        ]
      }
    },
    versionFromParam: {
      all: {}
    },
    noop: {
      all: {}
    }
  });

  // load NPM tasks
  grunt.loadNpmTasks('grunt-contrib-jshint');
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
  
  grunt.registerMultiTask('versionFromParam', 'Use the version from a parameter --as', function() {
    setVersion(grunt.option('as'));
  });
  
  grunt.registerMultiTask('noop', 'Does nothing', function() {});

  // set up grunt task options
  grunt.registerTask('default', ['build']);
  
  grunt.registerTask('build', [
    'jshint',
    (grunt.option('as')) ? 'versionFromParam' : 'shell:versionFromTag',

    // build the main file
    'concat:main',
    'copy:concat_to_final',
    'copy:final_to_main',
    'copy:concat_to_uglify',
    'uglify:file',
    'copy:uglify_to_final',
    'copy:final_to_main_min',

    // build the plugin file
    'concat:plugins',
    'copy:concat_to_final',
    'copy:final_to_plugins',
    'copy:concat_to_uglify',
    'uglify:file',
    'copy:uglify_to_final',
    'copy:final_to_plugins_min',
  
    // build the relay file
    'concat:relayHtml',
    'copy:concat_to_final',
    'copy:final_to_relay',
  
    // copy the legal files over
    'copy:legal_to_legal',
  
    // clean up
    'clean:tmp'
  ]);
  
  grunt.registerTask('release', [
    'build',
    'copy:recent_to_release',
    'compress:release',
    'log:release',
    (grunt.option('as')) ? 'tagit' : 'noop',
  ]);
  
  grunt.registerTask('tagit', [
    'shell:git_add',
    'shell:git_commit',
    'shell:git_tag',
    'log:pushInstructions'
  ]);

  grunt.registerTask('test', [
    'build',
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
};