/*
Inject
Copyright 2013 LinkedIn

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing,
software distributed under the License is distributed on an "AS
IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
express or implied.   See the License for the specific language
governing permissions and limitations under the License.
*/
var path = require('path');

module.exports = function (grunt) {
  
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

  grunt.initConfig({
    output_files: {
      main:         './dist/recent/inject.js',
      main_min:     './dist/recent/inject.min.js',
      license:      './dist/recent/LICENSE',
      readme:       './dist/recent/README.md',
      plugins:      './dist/recent/plugins/',
      relay:        './dist/recent/relay.html',
      release:      'dist/inject-__INJECT__VERSION__/'
    },
    zip_locations: {
      archive:      'inject-__INJECT__VERSION__.tgz',
      path:         'inject-__INJECT__VERSION__'
    },
    version_string: '__INJECT__VERSION__',
    anonymous_header: '',
    anonymous_footer: '',
    relay_html_header: '<!DOCTYPE html>\n<html><head>\n<script type="text/javascript">',
    relay_html_footer: '\n</script>\n</body>\n</html>',

    /**
     * clean: clean up temp and artifact directories
     */
    clean: {
      tmp: ['./tmp'],
      dist: ['./dist/inject-*']
    },

    /**
     * shell: run shell commands. We use this for git ops
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
      git_tag_release: {
        command: 'git tag -a <%= version_string %> -m "Release <%= version_string %> (via grunt)"',
        options: {
          callback: function(err, stdout, stderr, next) {
            next();
          }
        }
      },
      venus_automated: {
        command: 'node ./node_modules/venus/bin/venus "tests/" -e ghost',
        options: {
          stdout: true
        }

      },
      venus_browser: {
        command: 'node ./node_modules/venus/bin/venus run -t "tests/"',
        options: {
          stdout: true
        }
      }
    },

    /**
     * copy: copy files that need no modification
     */
    copy: {
      concat_to_final: {
        files: {'./tmp/final.out': './tmp/concat.out'}
      },
      fiber_to_tmp: {
        files: [
          {src: ['./node_modules/fiber/src/fiber.js'], dest: './tmp/lib/fiber/fiber.js', filter: 'isFile'}
        ]
      },
      inject_to_uglify: {
        files: {
          // dest: src
          './tmp/uglify.in': './tmp/inject.js'
        }
      },
      inject_to_final: {
        files: {'./tmp/final.out': './tmp/inject.js'}
      },
      final_to_main: {
        files: [{src: './tmp/final.out', dest: '<%= output_files.main %>', filter: 'isFile'}]
      },
      final_to_main_min: {
        files: [{src: './tmp/final.out', dest: '<%= output_files.main_min %>', filter: 'isFile'}]
      },
      final_to_relay: {
        files: [{src: './tmp/final.out', dest: '<%= output_files.relay %>', filter: 'isFile'}]
      },
      legal_to_legal: {
        files:[
          {src: ['./LICENSE'], dest: '<%= output_files.license %>', filter: 'isFile'},
          {src: ['./README.md'], dest: '<%= output_files.readme %>', filter: 'isFile'}
        ]
      },
      plugins_to_plugins: {
        files: [{expand: true, cwd: './src/plugins/', src: ['**'], dest: '<%= output_files.plugins %>'}]
      },
      recent_to_release: {
        expand: true,
        cwd: 'dist/recent',
        src: '*',
        dest: '<%= output_files.release %>'
      },
      uglify_to_final: {
        files: {'./tmp/final.out': './tmp/uglify.out'}
      }
    },
    
    concat: {
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
     * Do a bower install of browser-ready components Atomic needs
     */
    bower: {
      install: {
        options: {
          targetDir: './tmp/lib',
          layout: 'byComponent',
          install: true,
          verbose: false,
          cleanTargetDir: true,
          cleanBowerDir: true
        }
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
            './src/includes/*.js',
            './src/xd/*.js',
            './plugins/**/*.js',
            './tests/src/**/*.js',
            './server.js'
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
          except: ['require', 'define', 'Fiber', 'undefined']
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
     * includereplace: replace segments of a file with contents of another
     */
    includereplace: {
      inject: {
        options: {
          globals: {
            INJECT_VERSION: '<%= version_string %>'
          },
          prefix: '\/\/@@',
          suffix: ''
        },
        src: './src/inject.js',
        dest: './tmp'
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
     * express: runs our server for examples
     */
    express: {
      server: {
        options: {
          port: 4000,
          debug: true,
          server: path.resolve('./server.js')
        }
      },
      alternate: {
        options: {
          port: 4001,
          debug: true,
          server: path.resolve('./server.js')
        }
      }
    },

    log: {
      server: {
        options: {
          message: [
            '',
            'Server started at http://localhost:4000'
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
          ].join('\n')
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
    
    changelog: {
      options: {
        github: 'jakobo/atomic',
        version: '<%= version_string %>'
      }
    },
    
    bumpup: {
      options: {
        dateformat: 'YYYY-MM-DD HH:mm'
      },
      setters: {
        version: function (old, releaseType, options) {
          return grunt.config.get('version_string');
        }
      },
      files: [
        'package.json',
        'bower.json'
      ]
    },

    versionFromParam: {},
    noop: {},
    autofail: {}
  });

  // load NPM tasks
  grunt.loadNpmTasks('grunt-bower-task');
  grunt.loadNpmTasks('grunt-bumpup');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-compress');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-qunit');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-conventional-changelog');
  grunt.loadNpmTasks('grunt-express');
  grunt.loadNpmTasks('grunt-include-replace');
  grunt.loadNpmTasks('grunt-shell');
  
  grunt.registerMultiTask('log', 'Print some messages', function() {
    grunt.log.writeln(this.data.options.message);
  });
  
  grunt.registerTask('versionFromParam', 'Use the version from a parameter --as', function() {
    setVersion(grunt.option('as'));
  });
  
  grunt.registerTask('noop', 'Does nothing', function() {});
  
  grunt.registerTask('autofail', 'Automatically stops a build', function() {
    throw new Error('Build halted');
  });

  // set up grunt task options
  grunt.registerTask('default', ['build']);
  
  grunt.registerTask('build', [
    'bower:install',
    'copy:fiber_to_tmp', // fiber is in NPM, not bower, so copy it over
    'jshint',
    (grunt.option('as')) ? 'versionFromParam' : 'shell:versionFromTag',
    
    // create the inject.js file and it's min version
    'includereplace:inject',
    'copy:inject_to_final',
    'copy:final_to_main',
    'copy:inject_to_uglify',
    'uglify:file',
    'copy:uglify_to_final',
    'copy:final_to_main_min',
    
    // copy the support files
    'copy:legal_to_legal',
    'copy:plugins_to_plugins',
    
    // create the relay file
    'concat:relayHtml',
    'copy:concat_to_final',
    'copy:final_to_relay',
    
    // clean up
    'clean:tmp'
  ]);
  
  grunt.registerTask('release', [
    'build',
    'releasetest',
    'copy:recent_to_release',
    'compress:release',
    'log:release',
    (grunt.option('as')) ? 'genlog' : 'noop',
    (grunt.option('as')) ? 'setversion' : 'noop',
    (grunt.option('as')) ? 'tagit' : 'noop'
  ]);
  
  grunt.registerTask('genlog', [
    (grunt.option('as')) ? 'versionFromParam' : 'noop',
    (grunt.option('as')) ? 'noop' : 'autofail',
    'changelog'
  ]);
  
  grunt.registerTask('setversion', [
    (grunt.option('as')) ? 'versionFromParam' : 'noop',
    (grunt.option('as')) ? 'noop' : 'autofail',
    'bumpup'
  ]);
  
  grunt.registerTask('tagit', [
    (grunt.option('as')) ? 'versionFromParam' : 'noop',
    (grunt.option('as')) ? 'noop' : 'autofail',
    'shell:git_add',
    'shell:git_commit_release',
    'shell:git_tag_release',
    'log:pushInstructions'
  ]);
  
  grunt.registerTask('test', [
    'build',
    'express:server',
    'express:alternate',
    'qunit',
    'express-stop'
  ]);
  
  grunt.registerTask('releasetest', [
    'express:generic',
    'express:alternate',
    'qunit',
    'express-stop'
  ]);
  
  grunt.registerTask('itest', [
    'build',
    'server'
  ]);

  grunt.registerTask('server', [
    'express:server',
    'express:alternate',
    'log:server',
    'express-keepalive'
  ]);
};
