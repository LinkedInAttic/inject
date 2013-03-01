// gruntfile

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
    anonymous_header: '!(function(context, undefined){',
    anonymous_footer: 'context.Inject.version = "__INJECT__VERSION__";\n})(this);',

    // these are the possible output files when done
    output_files: {
      main:         './artifacts/inject-__INJECT__VERSION__/inject.js',
      main_min:     './artifacts/inject-__INJECT__VERSION__/inject.min.js',
      ie7:          './artifacts/inject-__INJECT__VERSION__/inject-ie7.js',
      ie7_min:      './artifacts/inject-__INJECT__VERSION__/inject-ie7.min.js',
      plugins:      './artifacts/inject-__INJECT__VERSION__/inject-plugins.js',
      plugins_min:  './artifacts/inject-__INJECT__VERSION__/inject-plugins.min.js',
      license:      './artifacts/inject-__INJECT__VERSION__/LICENSE',
      readme:       './artifacts/inject-__INJECT__VERSION__/README.markdown',
      relayHtml:    './artifacts/inject-__INJECT__VERSION__/relay.html',
      relaySwf:     './artifacts/inject-__INJECT__VERSION__/relay.swf'
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
      noxd: {
        files: [
          {src: [genFileName('concat', 'noxd')], dest: '<%= output_files.main %>', filter: 'isFile'},
          {src: [genFileName('uglify', 'noxd')], dest: '<%= output_files.main_min %>', filter: 'isFile'}
        ]
      },
      ie7: {
        files: [
          {src: [genFileName('concat', 'ie7')], dest: '<%= output_files.ie7 %>', filter: 'isFile'},
          {src: [genFileName('uglify', 'ie7')], dest: '<%= output_files.ie7_min %>', filter: 'isFile'}
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
          {src: ['./src/xd/relay.html'], dest: '<%= output_files.relayHtml %>', filter: 'isFile'},
          {src: ['./src/xd/relay.swf'], dest: '<%= output_files.relaySwf %>', filter: 'isFile'}
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
          except: ['require', 'define', 'easyxdm', 'localstorage', 'undefined']
        }
      },
      main: {
        files: {} // placeholder
      },
      noxd: {
        files: {} // placeholder
      },
      ie7: {
        files: {}, // placeholder
        options: {
          banner: grunt.file.read('./src/compat/localstorage-assets.txt')
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
        dest: '', // placeholder
        options: {
          separator: ';'
        },
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
        options: {
          separator: ';'
        },
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
      },
      ie7: {
        dest: '', // placeholder
        options: {
          separator: '\n',
          banner: grunt.file.read('./src/compat/localstorage-assets.txt'),
          footer: ''
        },
        src: [
          './src/compat/localstorage-shim.js',
          './src/compat/json.js'
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

  cfg = {};
  cfg[genFileName('uglify', 'ie7')] = genFileName('concat', 'ie7');
  grunt.config.set('uglify.ie7.files', cfg);

  grunt.config.set('concat.main.dest', genFileName('concat', 'main'));
  grunt.config.set('concat.noxd.dest', genFileName('concat', 'noxd'));
  grunt.config.set('concat.ie7.dest', genFileName('concat', 'ie7'));

  // load NPM tasks
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-compress');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-shell');

  // set up grunt task options
  grunt.registerTask('default', [
    'jshint',
    'shell:tag',
    'concat:main',
    'uglify:main',
    'copy:legalish',
    'copy:xd',
    'copy:main',
    'clean:tmp'
  ]);

  grunt.registerTask('noxd', [
    'jshint',
    'shell:tag',
    'concat:noxd',
    'uglify:noxd',
    'copy:legalish',
    'copy:noxd',
    'clean:tmp'
  ]);

};