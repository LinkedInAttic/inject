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
var Analyzer = Fiber.extend(function() {

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

      var strippedModuleList = [],
          len = modules.length,
          i = 0;

      for (i; i < len; i++) {
        //modules[i] is the moduleId
        if (!BUILTINS[modules[i]]) {
          strippedModuleList.push(modules[i]);
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
      /*jshint boss:true */

      var dependencies = [],
          dependencyCache = {
            require: 1,
            module: 1,
            exports: 1
          },
          item,
          term,
          dep;

      if (!file) {
        return [];
      }

      file = file.replace(JS_COMMENTS_REGEX, '');

      while (item = REQUIRE_REGEX.exec(file)) {
        dep = item[1];
        if (!dependencyCache[dep]) {
          dependencyCache[dep] = 1;
          dependencies.push(dep);
        }
      }
      
      while (item = DEFINE_REGEX.exec(file)) {
        while (term = DEFINE_TERM_REGEX.exec(item[1])) {
          dep = term[1];
          if (!dependencyCache[dep]) {
            dependencyCache[dep] = 1;
            dependencies.push(dep);
          }
        }
      }
      
      return dependencies;
    }
  };
});
