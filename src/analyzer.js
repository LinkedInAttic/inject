/*
Inject
Copyright 2011 LinkedIn

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

/**
 * The analyzer module handles extract the clean dependencies list 
 * from a given file and supports remove buildin modules from a
 * given module list
 * @file
**/
var Analyzer;
(function() {
  var AsStatic = Class.extend(function() {
    return {
      /**
       * analyzer initialization
       * @constructs Analyzer
       */
      init: function() {},
      
      /**
       * Clean up moduleIds by removing all buildin modules 
       * (requie, exports, module) from a given module list
       * @method Analyzer.stripBuiltins
       * @param {Array} modules - a dirty list of modules
       * @public
       * @returns {Array} a clean list of modules without buildins
       */
      stripBuiltins: function(modules) {
        var strippedModuleList = [];
        var moduleId;
        for (var i = 0, len = modules.length; i < len; i++) {
          moduleId = modules[i];
          if (moduleId !== "require" && moduleId !== "exports" && moduleId !== "module") {
            strippedModuleList.push(moduleId);
          }
        }
        return strippedModuleList;
      },
      
      /**
       * Extract the clean dependency requires from a given file as
       * String, remove all buildin requires, merge requires from
       * AMD define purpose
       * @method Analyzer.extractRequires
       * @param {String} file - a string of a file
       * @public
       * @returns {Array} a clean list of dependency requires from a 
       * module file
       */
      extractRequires: function(file) {
        var requires = [];
        var requireMatches = null;
        var defines = null;
        var uniques = {};
        var dirtyRuntimeRequires = [];
        var dirtyStaticRequires = [];
        var staticRequires = [];
        var inlineAMD = {};
        var match;

        // a local require function for eval purposes
        var require = function(term) {
          if (uniques[term] !== true) {
            requires.push(term);
          }
          uniques[term] = true;
        };
        
        // remove comment lines from the file to avoid adding
        // any requires from comments
        file = file.replace(JS_COMMENTS_REGEX, "");

        // handle runtime require statements
        while(match = REQUIRE_REGEX.exec(file)) {
          dirtyRuntimeRequires.push(match[0].match(GREEDY_REQUIRE_REXEX)[0]);
        }
        if (dirtyRuntimeRequires.length > 0) {
          try {
            eval([dirtyRuntimeRequires.join(";"), "//@ sourceURL=Inject-Analyzer.js"].join("\n"));
          }
          catch(err) {
            throw new Error("Invalid require() syntax found in file: " + dirtyRuntimeRequires.join(";"));
          }
        }

        // handle static require statements via define() API
        // then attach to master requires[] list
        // extract all define names, then all dependencies
        defines = file.match(DEFINE_EXTRACTION_REGEX);
        if (defines && defines.length) {
          each(defines, function(match) {
            var id = match.replace(DEFINE_EXTRACTION_REGEX, "$1");
            var deps = match.replace(DEFINE_EXTRACTION_REGEX, "$2");

            id = id.replace(BUILTINS_REPLACE_REGEX, "");
            deps = deps.replace(BUILTINS_REPLACE_REGEX, "").split(",");

            if (id) {
              inlineAMD[id] = true;
            }

            if (deps && deps.length) {
              for (var i = 0, len = deps.length; i < len; i++) {
                if (deps[i]) {
                  dirtyStaticRequires.push(deps[i]);
                }
              }
            }
          });

          // for each possible require, make sure we aren't already
          // running this inline
          each(dirtyStaticRequires, function(req) {
            if (uniques[req] !== true && inlineAMD[req] !== true) {
              requires.push(req);
            }
            uniques[req] = true;
          });
        }

        return requires;
      }
    };
  });
  Analyzer = new AsStatic();
})();
