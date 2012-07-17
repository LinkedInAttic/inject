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

var RulesEngine;
(function() {
  var rules = [];
  var rulesIsDirty = false;

  function sortRulesTable() {
    rules.sort(function(a, b) {
      return a.weight - b.weight;
    });
    rulesIsDirty = false;
  }

  function functionToPointcut(fn) {
    return "("+fn.toString().replace(/^\s\s*/, '').replace(/\s\s*$/, '')+")();";
  }

  var AsStatic = Class.extend(function() {
    return {
      init: function() {
        this.cache = {
          byUrl: {}
        };
      },
      // resolve: apply rules AND get URL
      resolve: function(identifier, relativeTo) {
        var dir = relativeTo;
        if (dir && !userConfig.baseDir) {
          dir = dir.split("/");
          if (dir[dir.length - 1]) {
            // not ending in /
            dir.pop();
          }
          dir = dir.join("/");
        }
        else if (dir) {
          // TODO: baseDir support for the wacky path people
          dir = userConfig.baseDir(dir);
        }

        // apply rules that match
        var result = this.applyRules(identifier);
        var url = this.toUrl(result.path, dir);

        this.cache.byUrl[url] = result;
        if (url == "/tests/spec/modules-1.1.1/includes/spec/divide.js") debugger;
        return {
          path: url,
          pointcuts: result.pointcuts
        };
      },
      getPointcuts: function(path, asString) {
        var pointcuts = this.cache.byUrl[path].pointcuts || [];
        var result = {
          before: [],
          after: []
        };
        var pointcut;

        if (typeof(asString) === "undefined") {
          return {
            before: pointcuts.before,
            after: pointcuts.after
          }
        }

        for (var i = 0, len = pointcuts.before.length; i < len; i++) {
          pointcut = pointcuts.before[i];
          result.before.push(functionToPointcut(pointcut));
        }
        for (var i = 0, len = pointcuts.after.length; i < len; i++) {
          pointcut = pointcuts.after[i];
          result.after.push(functionToPointcut(pointcut));
        }

        result.before = result.before.join("\n");
        result.after = result.after.join("\n");

        return result;

      },
      addRule: function(regexMatch, weight, ruleSet) {
        // regexMatch, ruleSet
        // regexMatch, weight, ruleSet
        if (typeof(ruleSet) === "undefined") {
          if (typeof(weight) === "undefined") {
            // one param
            ruleSet = regexMatch;
            weight = null;
            regexMatch = null;
          }

          // two params
          ruleSet = weight;
          weight = null;
        }

        // if weight was not set, create it
        if (!weight) {
          weight = rules.length;
        }

        if (typeof(ruleSet) === "string") {
          ruleSet = {
            path: ruleSet
          };
        }

        rules.push({
          matches: ruleSet.matches || regexMatch,
          weight: ruleSet.weight || weight,
          path: ruleSet.path,
          after: ruleSet.after,
          before: ruleSet.before
        });

      },
      manifest: function(manifestObj) {
        var key;
        var rule;

        for (key in manifestObj) {
          rule = manifestObj[key];
          this.addRule(key, rule);
        }
      },
      applyRules: function(identifier) {
        if (rulesIsDirty) {
          sortRulesTable();
        }

        var result = identifier;
        var payload;
        var beforePointCuts = [];
        var afterPointCuts = [];
        each(rules, function(rule) {
          var match = false;
          // rule matching
          if (typeof(rule.matches) === "string" && rule.matches === result) {
            match = true;
          }
          else if (typeof(rule.matches) === "object" && rule.matches.test(result)) {
            match = true;
          }
          // if we have a match, do a replace
          if (match) {
            if (typeof(rule.path) === "string") {
              result = rule.path;
            }
            else if (typeof(rule.path) === "function") {
              result = rule.path(result);
            }

            if (rule.before) {
              beforePointCuts.push(rule.before);
            }
            if (rule.after) {
              afterPointCuts.push(rule.after);
            }
          }
        });

        payload = {
          path: result || "",
          pointcuts: {
            before: beforePointCuts,
            after: afterPointCuts
          }
        };

        this.cache[result] = payload;

        return payload;

      },
      toUrl: function(path, relativeTo) {
        var blownApartURL;
        var resolvedUrl = [];

        // exit early on resolved http URL
        if (ABSOLUTE_PATH_REGEX.test(path)) {
          return path;
        }

        // if no module root, freak out
        if (!userConfig.moduleRoot) {
          throw new Error("module root needs to be defined for resolving URLs");
        }

        if (!relativeTo) {
          relativeTo = userConfig.moduleRoot;
        }

        // shortcut. If it starts with /, affix to module root
        if (path.indexOf("/") === 0) {
          resolvedUrl = userConfig.moduleRoot + path.substr(1);
          if (userConfig.useSuffix && !FILE_SUFFIX_REGEX.test(resolvedUrl)) {
            resolvedUrl = resolvedUrl + BASIC_FILE_SUFFIX;
          }
          return resolvedUrl;
        }

        // take off the strip ://
        relativeTo = relativeTo.replace(/:\/\//, "__INJECT_PROTOCOL_COLON_SLASH_SLASH__");
        path = path.replace(/:\/\//, "__INJECT_PROTOCOL_COLON_SLASH_SLASH__");

        blownApartURL = [].concat(relativeTo.split("/"), path.split("/"));
        for (var i = 0, len = blownApartURL.length; i < len; i++) {
          piece = blownApartURL[i];

          if (piece === "." || (piece === "" && i > 0)) {
            // skip . or "" (was "//" in url at position 0)
            continue;
          }
          else if (piece === "..") {
            // up one directory
            if (resolvedUrl.length === 0) {
              throw new Error("could not traverse higher than highest path");
            }
            resolvedUrl.pop();
          }
          else {
            // fragment okay, add
            resolvedUrl.push(piece);
          }
        }

        resolvedUrl = resolvedUrl.join("/");
        resolvedUrl = resolvedUrl.replace(/__INJECT_PROTOCOL_COLON_SLASH_SLASH__/, "://");

        if (userConfig.useSuffix && !FILE_SUFFIX_REGEX.test(resolvedUrl)) {
          resolvedUrl = resolvedUrl + BASIC_FILE_SUFFIX;
        }

        return resolvedUrl;

      }
    };
  });
  RulesEngine = new AsStatic();
})();
