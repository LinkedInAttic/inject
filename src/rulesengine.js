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
 * 
 * @file
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
    return fn.toString().replace(FUNCTION_BODY_REGEX, "$1");
  }

  var AsStatic = Class.extend(function() {
    return {
      /**
       * Creates a RulesEngine instance and initializes internal state.
       * @constructs RulesEngine
       */
      init: function() {
        this.pointcuts = {};
      },
      /**
       * Returns a path containing 'identifier', relative to the
       * 'relativeTo' path.  Any relative references (ex. '.' or '..')
       * are also resolved.
       * If 'identifier' is an absolute path, then relativeTo is ignored.
       * @param {string} identifier The identifier/path to resolve.
       * @param {string} [relativeTo] The path which 'identifier' is
       *    relatively resolved against.
       * @return {string} The 'identifier' parameter resolved.
       * @method
       * @public
       */
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
      /**
       * For a given 'path' and 'relativeTo', returns a resolved URL.
       * @param {string} path The path to resolve
       * @param {string} [relativeTo] If specified, 'path' is resolved
       *   relatively against this value.  If not specified, then
       *    userConfig.moduleRoot is used to resolve relatively against.
       * @return {string} Returns a URL resolved.  If 'path' itself is a
       *    URI, then path is returned.
       * @method
       * @public
       */
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

        // exit early on resolved http URL
        if (ABSOLUTE_PATH_REGEX.test(path)) {
          return path;
        }

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
      /**
       * Returns a path utilizing the given 'id' and 'base', resolving any
       * relative paths (ex. '.' or '..').
       * @param {string} id The 
       * @param {string} base The base
       * @return {string} A path of the form [base] + [id], with all relative
       *   paths resolved.
       * @method
       * @public
       */
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

      /**
       * Returns before and after advice to be run for a given join point,
       * specific to the given path.
       * @param {string} path The path whose pointcuts will be retrieved
       * @param {boolean} [asString] Specify a value to return the advice as
       *   string instances.  Otherwise, advice will be returned as functions.
       * @return {Object} An object with the following properties:
       *   <ul>
       *     <li>before {string[]|function[]}</li>
       *     <li>after {string[]|function[]}</li>
       *   </ul>
       * @method
       * @public
       */
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
      /**
       * Allows customization through specifying rules regarding how a given
       * module is resolved.
       * @see <a href="https://github.com/linkedin/inject/wiki/0.4.x-addRule-and-Your-Favorite-Library">Using addRule()</a>
       * @param {string|RegExp} regexMatch The regular expression or string
       *    of the module to resolve.
       * @param {number} [weight] The priority to give to the rule.  Useful
       *    when multiple matching rules are specified.
       * @param {string|Object} [ruleSet] An object that contains various
       *    properties for customizing how matches are resolved.
       * @param {string|Function} ruleSet.path The path to use when a match
       *    occurs.
       * @param {Object} ruleSet.pointcuts An object containing advice to run
       *    before and/or after a match is found.
       * @param {Function} ruleSet.pointcuts.before The function to execute
       *    before the join point is executed.
       * @param {Function} ruleSet.pointcuts.after The function to execute
       *    after the join point is executed.
       * @method
       * @public
       */
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
          last: ruleSet.last || false,
          path: ruleSet.path,
          pcAfter: (ruleSet.pointcuts && ruleSet.pointcuts.after) ? ruleSet.pointcuts.after : null,
          pcBefore: (ruleSet.pointcuts && ruleSet.pointcuts.before) ? ruleSet.pointcuts.before : null
        });

      },
      /**
       * Adds rules specified in the given manifest.
       * @see RulesEngine#addRule
       * @param {Object} manifestObj Rules to apply.  For each property/key in
       *   the object, the property/key will be the regexMatch in the call to
       *   addRule().  The property value will be the ruleSet.  If the value
       *   contains a 'matches' property, it will be used as the key instead.
       * @method
       * @public
       */
      manifest: function(manifestObj) {
        var key;
        var rule;

        for (key in manifestObj) {
          rule = manifestObj[key];
          // update the key to a "matches" if included in manifest
          if (rule.matches) {
            key = rule.matches;
          }
          this.addRule(key, rule);
        }
      },
      /**
       * Applies rules to given path.
       * @param {string} path
       * @return {Object} An object with the following properties:
       *   <ul>
       *     <li>resolved - the resolved path after applying rules.</li>
       *     <li>
       *       pointcuts - An object with 'before' and 'after' properties,
       *       each containing AOP advice to run
       *     </li>
       *   </ul>
       * @method
       * @public
       */
      applyRules: function(path) {
        if (rulesIsDirty) {
          sortRulesTable();
        }

        var result = path;
        var payload;
        var beforePointCuts = [];
        var afterPointCuts = [];
        var done = false;
        each(rules, function(rule) {
          if (done) return;

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

            if (rule.pcBefore) {
              beforePointCuts.push(rule.pcBefore);
            }
            if (rule.pcAfter) {
              afterPointCuts.push(rule.pcAfter);
            }
            if (rule.last) {
              done = true;
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
