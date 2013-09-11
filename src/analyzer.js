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
(function () {
  var AsStatic = Fiber.extend(function () {
    return {
      /**
       * analyzer initialization
       * @constructs Analyzer
       */
      init: function () {},
      
      /**
       * Clean up moduleIds by removing all buildin modules
       * (requie, exports, module) from a given module list
       * @method Analyzer.stripBuiltins
       * @param {Array} modules - a dirty list of modules
       * @public
       * @returns {Array} a clean list of modules without buildins
       */

      stripBuiltins: function (modules) {
        var strippedModuleList = [];
        for (var i = 0, len = modules.length; i < len; i++) {
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
      extractRequires: function (file) {
        /*jshint boss:true */
        file = file.replace(JS_COMMENTS_REGEX, '');
        var dependencies = [];
        var dependencyCache = {
          require: 1,
          module: 1,
          exports: 1
        };
        var item;
        var term;
        var dep;
        var requireRegex = new RegExp(
          '(?:^|[\\s;,=\\?:\\}\\)\\(])' + // begins with start of string, and any symbol a function call() can follow
          'require[\\s]*\\('+             // the keyword "require", whitespace, and then an opening paren
          '[\'"]'+                        // a quoted stirng (require takes a single or double quoted string)
          '([^\'"]+?)'+                   // the valid characters for a "module identifier"... includes AMD characters. You cannot match a quote
          '[\'"]' +                       // the closing quote character
          '\\)',                          // end of paren for "require"
          'gi'                            // flags: global, case-insensitive
        );

        var defineRegex = new RegExp(
          '(?:^|[\\s;,\\?\\}\\)\\(])' +   // begins with start of string, and any symbol a function call() can follow
          'define[\\s]*\\(' +             // the "define" keyword, followed by optional whitespace and its opening paren
          '.*?\\[' +                      // anything (don't care) until we hit the first [
          '(.*?)' +                       // our match (contents of the array)
          '\\]',                          // the closing bracket
          'gi'                            // flags: global, case-insensitive
        );

        var defineTermRegex = new RegExp(
          '[\'"]' +                       // a quote
          '(.*?)' +                       // the term inside of quotes
          '[\'"]',                        // the closing quotes
          'gi'                            // flags: global, case-insensitive
        );
        
        while (item = requireRegex.exec(file)) {
          dep = item[1];
          if (!dependencyCache[dep]) {
            dependencyCache[dep] = 1;
            dependencies.push(dep);
          }
        }
        
        while (item = defineRegex.exec(file)) {
          while (term = defineTermRegex.exec(item[1])) {
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
  Analyzer = new AsStatic();
})();
