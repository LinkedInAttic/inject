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
 * The Rules Engine is used to handle the deriving of pointcut and path
 * information for a given module identifier. It maintains an internal
 * rules table for the environment, and also caches the results of its
 * resolution.
 * @file
**/

var RulesEngine;
(function () {

  /**
   * the collection of rules
   * @private
   * @type {Array}
   */
  var rules = [];

  /**
   * have the rules been added to since last sorted
   * @private
   * @type {boolean}
   */
  var rulesIsDirty = false;

  /**
   * sort the rules table based on their "weight" property
   * @method RulesEngine.sortRulesTable
   * @private
   */
  function sortRulesTable() {
    rules.sort(function (a, b) {
      return b.weight - a.weight;
    });
    rulesIsDirty = false;
  }

  /**
   * convert a function to a pointcut string
   * @method RulesEngine.functionToPointcut
   * @param {Function} fn - the function to convert
   * @private
   * @returns {String} the internal body of the function
   */
  function functionToPointcut(fn) {
    return fn.toString().replace(FUNCTION_BODY_REGEX, '$1');
  }

  var AsStatic = Class.extend(function () {
    return {
      /**
       * Create a RulesEngine Object
       * @constructs RulesEngine
       */
      init: function () {
        this.pointcuts = {};
      },

      /**
       * Resolve an identifier after applying all rules
       * @method RulesEngine.resolveIdentifier
       * @param {String} identifier - the identifier to resolve
       * @param {String} relativeTo - a base path for relative identifiers
       * @public
       * @returns {String} the resolved identifier
       * @see RulesEngine.applyRules
       */
      resolveIdentifier: function (identifier, relativeTo) {
        if (!relativeTo) {
          relativeTo = '';
        }

        if (identifier.indexOf('.') !== 0) {
          relativeTo = '';
        }

        // basedir
        if (relativeTo) {
          relativeTo = relativeTo.split('/');
          relativeTo.pop();
          relativeTo = relativeTo.join('/');
        }

        if (identifier.indexOf('/') === 0) {
          return identifier;
        }

        identifier = this.computeRelativePath(identifier, relativeTo);

        if (identifier.indexOf('/') === 0) {
          identifier = identifier.split('/');
          identifier.shift();
          identifier = identifier.join('/');
        }

        return identifier;
      },

      /**
       * resolve a URL relative to a base path
       * @method RulesEngine.resolveUrl
       * @param {String} path - the path to resolve
       * @param {String} relativeTo - a base path for relative URLs
       * @public
       * @returns {String} a resolved URL
       */
      resolveUrl: function (path, relativeTo) {
        var resolvedUrl;

        // if no module root, freak out
        if (!userConfig.moduleRoot) {
          throw new Error('module root needs to be defined for resolving URLs');
        }

        if (relativeTo && !userConfig.baseDir) {
          relativeTo = relativeTo.replace(PROTOCOL_REGEX, PROTOCOL_EXPANDED_STRING).split('/');
          if (relativeTo[relativeTo.length - 1] && relativeTo.length !== 1) {
            // not ending in /
            relativeTo.pop();
          }
          relativeTo = relativeTo.join('/').replace(PROTOCOL_EXPANDED_REGEX, PROTOCOL_STRING);
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
          // store pointcuts based on the resolved URL
          this.pointcuts[resolvedUrl] = result.pointcuts;
          return path;
        }

        // take off the :// to replace later
        relativeTo = relativeTo.replace(PROTOCOL_REGEX, PROTOCOL_EXPANDED_STRING);
        path = path.replace(PROTOCOL_REGEX, PROTOCOL_EXPANDED_STRING);

        // #169: query strings in base
        if (/\?/.test(relativeTo)) {
          resolvedUrl = relativeTo + path;
        }
        else {
          resolvedUrl = this.computeRelativePath(path, relativeTo);
        }

        resolvedUrl = resolvedUrl.replace(PROTOCOL_EXPANDED_REGEX, PROTOCOL_STRING);

        if (userConfig.useSuffix && !FILE_SUFFIX_REGEX.test(resolvedUrl)) {
          resolvedUrl = resolvedUrl + BASIC_FILE_SUFFIX;
        }

        // store pointcuts based on the resolved URL
        this.pointcuts[resolvedUrl] = result.pointcuts;

        return resolvedUrl;
      },

      /**
       * Dismantles and reassembles a relative path by exploding on slashes
       * @method RulesEngine.computeRelativePath
       * @param {String} id - the initial identifier
       * @param {String} base - the base path for relative declarations
       * @private
       * @returns {String} a resolved path with no relative references
       */
      computeRelativePath: function (id, base) {
        var blownApartURL;
        var resolved = [];
        var piece;

        // exit early on resolved :// in a URL
        if (ABSOLUTE_PATH_REGEX.test(id)) {
          return id;
        }

        blownApartURL = [].concat(base.split('/'), id.split('/'));
        for (var i = 0, len = blownApartURL.length; i < len; i++) {
          piece = blownApartURL[i];

          if (piece === '.' || (piece === '' && i > 0)) {
            // skip . or "" (was "//" in url at position 0)
            continue;
          }
          else if (piece === '..') {
            // up one directory
            if (resolved.length === 0) {
              throw new Error('could not traverse higher than highest path');
            }
            resolved.pop();
          }
          else {
            // fragment okay, add
            resolved.push(piece);
          }
        }

        resolved = resolved.join('/');
        return resolved;
      },

      /**
       * Get the pointcuts associated with a given URL path
       * @method RulesEngine.getPointcuts
       * @param {String} path - the url path to get pointcuts for
       * @param {Boolean} asString - if TRUE, return the pointcuts bodies as a string
       * @public
       * @returns {Object} an object containing all pointcuts for the URL
       */
      getPointcuts: function (path, asString) {
        var pointcuts = this.pointcuts[path] || {before: [], after: []};
        var result = {
          before: [],
          after: []
        };
        var pointcut;

        if (typeof(asString) === 'undefined') {
          return {
            before: pointcuts.before,
            after: pointcuts.after
          };
        }

        for (var i = 0, len = pointcuts.before.length; i < len; i++) {
          pointcut = pointcuts.before[i];
          result.before.push(functionToPointcut(pointcut));
        }
        for (var i = 0, len = pointcuts.after.length; i < len; i++) {
          pointcut = pointcuts.after[i];
          result.after.push(functionToPointcut(pointcut));
        }

        result.before = result.before.join('\n');
        result.after = result.after.join('\n');

        return result;

      },

      clearRules: function () {
        rules = [];
        rulesIsDirty = false;
      },

      /**
       * Add a rule to the database. It can be called as:<br>
       * addRule(regexMatch, weight, ruleSet)<br>
       * addRule(regexMatch, ruleSet)<br>
       * addRule(ruleSet)<br>
       * The ruleSet object to apply contains a set of options.
       * <ul>
       * <li>ruleSet.matches: replaces regexMatch if found</li>
       * <li>ruleSet.weight: replaces weight if found</li>
       * <li>ruleSet.last: if true, no further rules are ran</li>
       * <li>ruleSet.path: a path to use instead of a derived path<br>
       *  you can also set ruleSet.path to a function, and that function will
       *  passed the current path for mutation</li>
       * <li>ruleSet.pointcuts.before: a function to run before executing this module</li>
       * <li>ruleSet.pointcuts.after: a function to run after executing this module</li>
       * </ul>
       * @method RulesEngine.addRule
       * @param {RegExp|String} regexMatch - a stirng or regex to match on
       * @param {int} weight - a weight for the rule. Larger values run later
       * @param {Object} ruleSet - an object containing the rules to apply
       * @public
       */
      addRule: function (regexMatch, weight, ruleSet) {
        // regexMatch, ruleSet
        // regexMatch, weight, ruleSet
        if (typeof(ruleSet) === 'undefined') {
          if (typeof(weight) === 'undefined') {
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

        if (typeof(ruleSet) === 'string') {
          ruleSet = {
            path: ruleSet
          };
        }

        rulesIsDirty = true;
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
       * a shortcut method for multiple addRule calls
       * @method RulesEngine.manifest
       * @param {Object} manifestObj - a "matchString":ruleSet object
       * @public
       * @see RulesEngine.addRule
       */
      manifest: function (manifestObj) {
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
       * Apply a set of rules to a given path
       * @method RulesEngine.applyRules
       * @param {String} path - the path to apply rules to
       * @private
       * @returns {Object} an object containing the resolved path and pointcuts
       */
      applyRules: function (path) {
        if (rulesIsDirty) {
          sortRulesTable();
        }

        var result = path;
        var payload;
        var beforePointCuts = [];
        var afterPointCuts = [];
        var done = false;
        each(rules, function (rule) {
          if (done) {
            return;
          }

          var match = false;
          // rule matching
          if (typeof(rule.matches) === 'string' && rule.matches === result) {
            match = true;
          }
          else if (typeof(rule.matches) === 'object' && rule.matches.test(result)) {
            match = true;
          }
          // if we have a match, do a replace
          if (match) {
            if (typeof(rule.path) === 'string') {
              result = rule.path;
            }
            else if (typeof(rule.path) === 'function') {
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
          resolved: result || '',
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
