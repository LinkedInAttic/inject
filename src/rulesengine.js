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
  // a collection of resolved module IDs
  var resolutionCache = {};
  var pointcutsCache = {};

  // a rules queue as a database object
  var rules = DataBase.create("rulesQueues", "queue").create("rules");

  function resetResolutionCache() {
    resolutionCache = {};
    pointcutsCache = {};
  }

  function getFromCache(moduleId) {
    return resolutionCache[moduleId];
  }

  function storeToCache(moduleId, resolved) {
    return resolutionCache[moduleId] = resolved;
  }

  function sortRulesTable() {
    rules.sort(function(a, b) {
      return a.weight - b.weight;
    });
  }

  function functionToPointcut(fn) {
    return "("+fn.toString().replace(/^\s\s*/, '').replace(/\s\s*$/, '')+")();";
  }

  var AsStatic = Class.extend(function() {
    return {
      init: function() {},
      getPointcuts: function(moduleId, asString) {
        this.resolve(moduleId);
        var pointcuts = getFromCache(moduleId).pointcuts;
        var result = {
          before: [],
          after: []
        };
        var pointcut;
        console.log(pointcuts);

        if (!asString) {
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

        console.log(result);

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
          weight = rules.size();
        }

        if (typeof(ruleSet) === "string") {
          ruleSet = {
            path: ruleSet
          };
        }

        rules.add({
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
      resolve: function(moduleId) {
        if (rules.isDirty()) {
          sortRulesTable();
          resetResolutionCache();
        }

        if (getFromCache(moduleId)) {
          return getFromCache(moduleId).resolved;
        }

        var result = moduleId;
        var payload;
        var beforePointCuts = [];
        var afterPointCuts = [];
        rules.each(function(rule) {
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
          result: result,
          pointcuts: {
            before: beforePointCuts,
            after: afterPointCuts
          }
        };

        // store to cache our result
        storeToCache(moduleId, payload);

        return result;

      },
      toUrl: function(moduleId, relativeTo) {
        var resolvedId = this.resolve(moduleId);
        var blownApartURL;
        var resolvedUrl = [];

        // exit early on resolved http URL
        if (ABSOLUTE_PATH_REGEX.test(resolvedId)) {
          return resolvedId;
        }

        // if no module root, freak out
        if (!userConfig.moduleRoot) {
          throw new Error("module root needs to be defined for resolving URLs");
        }

        if (!relativeTo) {
          relativeTo = userConfig.moduleRoot;
        }

        blownApartURL = [].concat(relativeTo.split("/"), resolvedId.split("/"));
        for (var i = 0, len = blownApartURL.length; i < len; i++) {
          piece = blownApartURL[i];

          if (piece === ".") {
            // skip .
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

        if (userConfig.useSuffix && !FILE_SUFFIX_REGEX.test(resolvedUrl)) {
          resolvedUrl = resolvedUrl + BASIC_FILE_SUFFIX;
        }

        return resolvedUrl;

      }
    };
  });
  RulesEngine = new AsStatic();
})();
