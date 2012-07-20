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
        this.pointcuts = {};
      },
      resolveIdentifier: function(identifier, relativeTo) {
        if (!relativeTo) {
          relativeTo = "";
        }

        if (identifier.indexOf(".") !== 0) {
          relativeTo = "";
        }

        // basedir
        if (relativeTo) {
          relativeTo = relativeTo.split("/");
          relativeTo.pop();
          relativeTo = relativeTo.join("/");
        }

        if (identifier.indexOf("/") === 0) {
          return identifier;
        }

        identifier = this.computeRelativePath(identifier, relativeTo);

        if (identifier.indexOf("/") === 0) {
          identifier = identifier.split("/");
          identifier.shift();
          identifier = identifier.join("/");
        }

        return identifier;
      },
      resolveUrl: function(path, relativeTo) {
        var resolvedUrl;

        // if no module root, freak out
        if (!userConfig.moduleRoot) {
          throw new Error("module root needs to be defined for resolving URLs");
        }

        if (relativeTo && !userConfig.baseDir) {
          relativeTo = relativeTo.split("/");
          if (relativeTo[relativeTo.length - 1]) {
            // not ending in /
            relativeTo.pop();
          }
          relativeTo = relativeTo.join("/");
        }
        else if (relativeTo) {
          relativeTo = userConfig.baseDir(relativeTo);
        }
        else {
          relativeTo = userConfig.moduleRoot;
        }

        // exit early on resolved http URL
        if (ABSOLUTE_PATH_REGEX.test(path)) {
          return path;
        }

        // Apply our rules to the path in progress
        var result = this.applyRules(path);
        path = result.resolved;

        // shortcut. If it starts with /, affix to module root
        if (path.indexOf("/") === 0) {
          resolvedUrl = userConfig.moduleRoot + path.substr(1);
          if (userConfig.useSuffix && !FILE_SUFFIX_REGEX.test(resolvedUrl)) {
            resolvedUrl = resolvedUrl + BASIC_FILE_SUFFIX;
          }
          return resolvedUrl;
        }

        // take off the :// to replace later
        relativeTo = relativeTo.replace(/:\/\//, "__INJECT_PROTOCOL_COLON_SLASH_SLASH__");
        path = path.replace(/:\/\//, "__INJECT_PROTOCOL_COLON_SLASH_SLASH__");

        var resolvedUrl = this.computeRelativePath(path, relativeTo);

        resolvedUrl = resolvedUrl.replace(/__INJECT_PROTOCOL_COLON_SLASH_SLASH__/, "://");

        if (userConfig.useSuffix && !FILE_SUFFIX_REGEX.test(resolvedUrl)) {
          resolvedUrl = resolvedUrl + BASIC_FILE_SUFFIX;
        }

        // store pointcuts based on the resolved URL
        this.pointcuts[resolvedUrl] = result.pointcuts;

        return resolvedUrl;
      },
      computeRelativePath: function(id, base) {
        var blownApartURL;
        var resolved = [];

        // exit early on resolved :// in a URL
        if (ABSOLUTE_PATH_REGEX.test(id)) {
          return id;
        }

        blownApartURL = [].concat(base.split("/"), id.split("/"));
        for (var i = 0, len = blownApartURL.length; i < len; i++) {
          piece = blownApartURL[i];

          if (piece === "." || (piece === "" && i > 0)) {
            // skip . or "" (was "//" in url at position 0)
            continue;
          }
          else if (piece === "..") {
            // up one directory
            if (resolved.length === 0) {
              throw new Error("could not traverse higher than highest path");
            }
            resolved.pop();
          }
          else {
            // fragment okay, add
            resolved.push(piece);
          }
        }

        resolved = resolved.join("/");
        return resolved;
      },

      getPointcuts: function(path, asString) {
        var pointcuts = this.pointcuts[path] || {before: [], after: []};
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
      applyRules: function(path) {
        if (rulesIsDirty) {
          sortRulesTable();
        }

        var result = path;
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
          resolved: result || "",
          pointcuts: {
            before: beforePointCuts,
            after: afterPointCuts
          }
        };

        return payload;

      }
    };
  });
  RulesEngine = new AsStatic();
})();
