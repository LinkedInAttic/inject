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

var Analyzer;
(function() {
  var AsStatic = Class.extend(function() {
    return {
      init: function() {},
      extractRequires: function(file) {
        var requires = [];
        var uniques = {};
        var match;
        var dirtyRuntimeRequires = [];
        var staticRequires = [];

        // a local require function for eval purposes
        var require = function(term) {
          if (uniques[term] !== true) {
            requires.push(term);
          }
          uniques[term] = true;
        };

        file = file.replace(JS_COMMENTS_REGEX, "");

        // handle runtime require statements
        while(match = REQUIRE_REGEX.exec(file)) {
          dirtyRuntimeRequires.push(match[0].match(GREEDY_REQUIRE_REXEX)[0]);
        }
        if (dirtyRuntimeRequires.length > 0) {
          try {
            eval(dirtyRuntimeRequires.join(";"));
          }
          catch(err) {
            throw new Error("Invalid require() syntax found in file: " + dirtyRuntimeRequires.join(";"));
          }
        }

        // handle static require statements via define() API
        // then attach to master requires[] list
        if(DEFINE_REGEX.exec(file)) {
          staticRequires = DEFINE_REGEX.exec(file)[2].replace(BUILTINS_REGEX, "").split(",");
        }
        for (var i = 0, len = staticRequires.length; i < len; i++) {
          if (uniques[staticRequires[i]] !== true) {
            requires.push(staticRequires[i]);
          }
          uniques[staticRequires[i]] = true;
        }

        return requires;
      },
      getFunctionArgs: function(fn) {
        // extract the function line, remove all newlines, remove all whitespace, split on commas
        var result = fn.toString().match(FUNCTION_REGEX)[1]
          .replace(FUNCTION_NEWLINES_REGEX, "")
          .replace(WHITESPACE_REGEX, "")
          .split(",");
        if (result.length === 1 && !result[0]) {
          // corner case, we actually extracted nothing here...
          return [];
        }
        return result;
      }
    };
  });
  Analyzer = new AsStatic();
})();
