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

  // this regex is used to strip leading slashes
  var LEADING_SLASHES_REGEX = /^\/+/g;

  /**
   * Return the "base" directory of a given path
   * @method RulesEngine.basedir
   * @private
   * @param {String} dir - the directory or path to get the basedir of
   */
  var basedir = function(dir) {
    dir = dir.split('/');
    dir.pop();
    dir = dir.join('/');
    return dir;
  };

  var AsStatic = Fiber.extend(function () {
    return {
      /**
       * Create a RulesEngine Object
       * @constructs RulesEngine
       */
      init: function () {
        this.clearRules();
      },

      /**
       * Clear all the rules (and thus all the caches)
       * Used to reset the rules engine
       * @method RulesEngine.clearRules
       */
      clearRules: function() {
        this.moduleRules = [];
        this.fileRules = [];
        this.contentRules = [];
        this.fetchRules = [];
        this.aliasRules = {};
        this.revAliasRules = {};
        this.dirty = {
          moduleRules: true,
          fileRules: true,
          contentRules: true,
          fetchRules: true,
          aliasRules: true,
          revAliasRules: true
        };
        this.caches = {
          moduleRules: {},
          fileRules: {},
          contentRules: {},
          fetchRules: {},
          aliasRules: {},
          revAliasRules: {}
        };

        // deprecated
        // deprecated legacy pointcuts from addRule
        this.addRuleCounter = 0;
        this.addRulePointcuts = {};
        // end deprecated
      },

      /**
       * Add a rule to the collection
       * @method RulesEngine.add
       * @private
       * @param {String} type - the type of rule to add
       * @param {Regex|String} matches - what does this match against
       * @param {Function} rule - the rule to apply
       * @param {Object} options - the options for this rule
       */
      add: function (type, matches, rule, options) {
        this.dirty[type] = true;
        options = options || {};
        var weight = options.weight || this[type].length;
        var last = options.last || false;
        this[type].push({
          matches: matches,
          fn: (typeof rule === 'function') ? rule : function() { return rule; },
          weight: weight,
          last: last,
          all: options
        });
      },

      /**
       * Clear a specific cache
       * @method RulesEngine.clearCache
       * @private
       * @param {String} type - the type of cache to clear
       */
      clearCache: function(type) {
        this.caches[type] = {};
      },

      /**
       * Sort a collection of rules by weight
       * @method RulesEngine.sort
       * @private
       * @param {String} type - the type of rules to sort
       */
      sort: function (type) {
        if (!this.dirty[type]) {
          return;
        }
        this.clearCache(type);
        this[type].sort(function (a, b) {
          return b.weight - a.weight;
        });
        this.dirty[type] = false;
      },

      /**
       * Get the deprecated pointcuts. This method exists
       * while the addRule structure is deprecated
       * @deprecated
       * @method RulesEngine.getDeprecatedPointcuts
       * @param {String} moduleId - the module id to get pointcuts for
       * @returns {Array}
       */
      getDeprecatedPointcuts: function(moduleId) {
        return this.addRulePointcuts[moduleId] || [];
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
       * <li>ruleSet.pointcuts.afterFetch: a function to mutate the file after retrieval, but before analysis</li>
       * </ul>
       * @method RulesEngine.addRule
       * @param {RegExp|String} matches - a stirng or regex to match on
       * @param {int} weight - a weight for the rule. Larger values run later
       * @param {Object} rule - an object containing the rules to apply
       * @public
       * @deprecated
       */
      addRule: function (matches, weight, rule) {
        if (!rule) {
          rule = weight;
          weight = null;
        }
        if (!rule) {
          rule = {};
        }
        if (typeof rule === 'string') {
          rule = {
            path: rule
          };
        }
        if (!rule.weight) {
          rule.weight = this.addRuleCounter++;
        }

        if (rule.path) {
          this.addFileRule(matches, rule.path, {
            weight: rule.weight,
            last: rule.last,
            useSuffix: rule.useSuffix,
            afterFetch: (rule.pointcuts && rule.pointcuts.afterFetch) ? rule.pointcuts.afterFetch : null
          });
        }
        else if (rule.pointcuts && rule.pointcuts.afterFetch) {
          this.addContentRule(matches, rule.pointcuts.afterFetch, {
            weight: rule.weight
          });
        }
      },

      /**
       * Add a module ID rule to the system
       * A module rule can convert one module ID to another. This is
       * useful for maintaining module ID's even when you move modules
       * around in a backwards incompatible way
       * @method RulesEngine.addModuleRule
       * @param {String|Regex} matchesId - if the module matches this pattern, then rule will be used
       * @param {String|Function} rule - a string or function that describes how to transform the module id
       * @param {Object} options - the additional options for this rule such as "last" (last rule to run), "weight" (change the ordering)
       */
      addModuleRule: function (matchesId, rule, options) {
        return this.add('moduleRules', matchesId, rule, options);
      },

      /**
       * Add a file path rule to the system
       * A file rule can convert one file path to another. This is useful
       * for redirecting one link to another. For example, a base path of "jquery"
       * can be redirected to a specific jQuery version.
       * @method RulesEngine.addFileRule
       * @param {String|Regex} matchesPath - if the path matches this pattern, then rule will be used
       * @param {String|Function} rule - a string or function that describes how to transform the path
       * @param {Object} options - the additional options for this rule such as "last" (last rule to run), "weight" (change the ordering)
       */
      addFileRule: function (matchesPath, rule, options) {
        return this.add('fileRules', matchesPath, rule, options);
      },

      /**
       * Add a content transformation rule
       * Content transformations allow you to change the file's contents itself,
       * without altering the original file. This allows you to do things like
       * <ul>
       *   <li>Shim "jQuery" and store it in module.exports</li>
       *   <li>Download a non-js file and convert it to a JS object (like our plugins)</li>
       *   <li>Replace the file with an altered version</li>
       * </ul>
       * @method RulesEngine.addFileRule
       * @param {String|Regex} matchesPath - if the path matches this pattern, then rule will be used
       * @param {RulesEngine~contentRuleCallback} rule - a function that describes how to transform the content
       * @param {Object} options - the additional options for this rule
       */
      /**
       * The content rule function allows you to asychronously change a file
       * @callback RulesEngine~contentRuleCallback
       * @param {Function} next - a function to call on completion, takes "error" and "result"
       * @param {String} content - the current content
       */
      addContentRule: function (matchesPath, rule, options) {
        return this.add('contentRules', matchesPath, rule, options);
      },

      /**
       * Add a path retrieval rule
       * Path retrieval rules allow us to change how we get our content. This allows
       * specific modules to bypass the default communicator fetch process.
       * @method RulesEngine.addFetchRule
       * @param {String|Regex} matchesId - if the id matches this pattern, then rule will be used
       * @param {RulesEngine~fetchRuleCallback} rule - a function that describes how to transform the path
       * @param {Object} options - the additional options for this rule
       */
      /**
       * The fetch rule function allows you to asychronously download the file
       * @callback RulesEngine~fetchRuleCallback
       * @param {Function} next - a function to call on completion, takes "error" and "result"
       * @param {String} content - the current content
       * @param {Object} resolver - a resolver with two methods: module() for module resolution, and url()
       * @param {Communicator} communicator - a partial Communicator object, with a get() function
       * @param {Object} options - additional options such as a parent reference
       */
      addFetchRule: function (matchesId, rule, options) {
        return this.add('fetchRules', matchesId, rule, options);
      },

      /**
       * Add a package alias. Useful for installing a module into a global location
       * @method RulesEngine.addPackage
       * @param {String} resolvedId - the resolved ID to match against
       * @param {String} alsoKnownAs - the alternate ID for this matching string
       */
       // jquery-1.7 aka jquery
      addPackage: function (resolvedId, alsoKnownAs) {
        this.dirty.aliasRules = true;
        if (this.aliasRules[resolvedId] || this.revAliasRules[alsoKnownAs]) {
          throw new Error('addPackage is a 1:1 relationship');
        }
        this.aliasRules[resolvedId] = alsoKnownAs;
        this.revAliasRules[alsoKnownAs] = resolvedId;
      },

      /**
       * Resolve an identifier after applying all rules
       * @method RulesEngine.resolveModule
       * @param {String} moduleId - the identifier to resolve
       * @param {String} relativeTo - a base path for relative identifiers
       * @public
       * @returns {String} the resolved identifier
       */
      resolveModule: function (moduleId, relativeTo) {
        // if (!this.dirty.moduleRules && this.caches.moduleRules[moduleId]) {
        //   return this.caches.moduleRules[moduleId];
        // }

        this.sort('moduleRules');
        var lastId = moduleId;
        var i = 0;
        var rules = this.moduleRules;
        var len = rules.length;
        var isMatch = false;
        var matches;
        var fn;
        for (i; i < len; i++) {
          matches = rules[i].matches;
          fn = rules[i].fn;

          isMatch = false;
          if (typeof matches === 'string') {
            if (matches === moduleId) {
              isMatch = true;
            }
          }
          else if (typeof matches.test === 'function') {
            isMatch = matches.test(moduleId);
          }

          if (isMatch) {
            lastId = fn(lastId);
            if (matches.last) {
              break;
            }
          }
        }

        // shear off all leading slashes
        lastId = lastId.replace(LEADING_SLASHES_REGEX, '');

        // we don't need/want relativeTo if there's no leading .
        if (lastId.indexOf('.') !== 0) {
          relativeTo = null;
        }

        // adjust relativeTo to a basedir if provided
        if (relativeTo) {
          relativeTo = basedir(relativeTo);
        }

        // compute the relative path
        lastId = this.getRelative(lastId, relativeTo);

        // strip leading / as it is not needed
        lastId = lastId.replace(LEADING_SLASHES_REGEX, '');

        // cache and return
        this.caches.moduleRules[moduleId] = lastId;
        return lastId;
      },

      /**
       * resolve a URL relative to a base path
       * @method RulesEngine.resolveFile
       * @param {String} path - the path to resolve
       * @param {String} relativeTo - a base path for relative URLs
       * @param {Boolean} noSuffix - do not use a suffix for this resolution
       * @public
       * @returns {String} a resolved URL
       */
      resolveFile: function (path, relativeTo, noSuffix) {
        // if (!this.dirty.fileRules && this.caches.fileRules[path]) {
        //   return this.caches.fileRules[path];
        // }

        this.sort('fileRules');
        var lastPath = path;
        var i = 0;
        var rules = this.fileRules;
        var len = rules.length;
        var isMatch = false;
        var matches;
        var fn;

        // deprecated
        var deprecatedPointcuts = [];
        // end deprecated

        for (i; i < len; i++) {
          matches = rules[i].matches;
          fn = rules[i].fn;

          isMatch = false;
          if (typeof matches === 'string') {
            if (matches === path) {
              isMatch = true;
            }
          }
          else if (typeof matches.test === 'function') {
            isMatch = matches.test(path);
          }

          if (isMatch) {
            lastPath = fn(lastPath);

            // deprecated
            if (rules[i].all && rules[i].all.afterFetch) {
              deprecatedPointcuts.push(rules[i].all.afterFetch);
            }
            // end deprecated

            if (rules[i].last) {
              break;
            }
          }
        }

        // if no module root, freak out
        if (!userConfig.moduleRoot) {
          throw new Error('module root needs to be defined for resolving URLs');
        }

        if (!lastPath) {
          // store deprecated pointcuts
          // deprecated
          this.addRulePointcuts[lastPath] = deprecatedPointcuts;
          // end deprecated

          // store and return
          this.caches.fileRules[path] = lastPath;
          return lastPath;
        }

        // if there is no basedir function from the user, we need to slice off the last segment of relativeTo
        // otherwise, we can use the baseDir() function
        // otherwise (no relativeTo) it is relative to the moduleRoot
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
        if (ABSOLUTE_PATH_REGEX.test(lastPath)) {
          this.caches.fileRules[path] = lastPath;
          return lastPath;
        }

        // take off the :// to replace later
        relativeTo = relativeTo.replace(PROTOCOL_REGEX, PROTOCOL_EXPANDED_STRING);
        lastPath = lastPath.replace(PROTOCOL_REGEX, PROTOCOL_EXPANDED_STRING);

        // #169: query strings in base
        if (/\?/.test(relativeTo)) {
          lastPath = relativeTo + lastPath;
        }
        else {
          lastPath = this.getRelative(lastPath, relativeTo);
        }

        // restore the ://
        lastPath = lastPath.replace(PROTOCOL_EXPANDED_REGEX, PROTOCOL_STRING);

        // add a suffix if required
        if (!noSuffix && userConfig.useSuffix && !FILE_SUFFIX_REGEX.test(lastPath)) {
          lastPath = lastPath + BASIC_FILE_SUFFIX;
        }

        // store deprecated pointcuts
        // deprecated
        this.addRulePointcuts[lastPath] = deprecatedPointcuts;
        // end deprecated

        // store and return
        this.caches.fileRules[path] = lastPath;
        return lastPath;
      },

      getPackages: function (id, searchByAlias) {
        // if (!this.dirty.aliasRules && this.caches.aliasRules[resolvedId]) {
        //   return this.caches.aliasRules[resolvedId];
        // }
        var aliases = (searchByAlias) ? this.revAliasRules[id] : this.aliasRules[id];
        // this.caches.aliasRules[resolvedId] = aliases || [];
        return aliases;
      },

      getFetchRules: function (moduleId) {
        // if (!this.dirty.fetchRules && this.caches.fetchRules[moduleId]) {
        //   return this.caches.fetchRules[moduleId];
        // }
        this.sort('fetchRules');

        var i = 0;
        var rules = this.fetchRules;
        var len = rules.length;
        var isMatch = false;
        var matches;
        var fn;
        var matchingRules = [];
        for (i; i < len; i++) {
          matches = rules[i].matches;
          fn = rules[i].fn;

          isMatch = false;
          if (typeof matches === 'string') {
            if (matches === moduleId) {
              isMatch = true;
            }
          }
          else if (typeof matches.test === 'function') {
            isMatch = matches.test(moduleId);
          }

          if (isMatch) {
            matchingRules.push(fn);
          }
        }

        this.caches.contentRules[moduleId] = matchingRules;
        return matchingRules;
      },

      getContentRules: function (path) {
        // if (!this.dirty.contentRules && this.caches.contentRules[path]) {
        //   return this.caches.contentRules[path];
        // }
        this.sort('contentRules');

        var i = 0;
        var rules = this.contentRules;
        var len = rules.length;
        var isMatch = false;
        var matches;
        var fn;
        var matchingRules = [];
        var found = false;

        // deprecated
        var deprecatedPointcuts = this.addRulePointcuts[path] || [];
        // end deprecated

        for (i; i < len; i++) {
          matches = rules[i].matches;
          fn = rules[i].fn;

          isMatch = false;
          if (typeof matches === 'string') {
            if (matches === path) {
              isMatch = true;
            }
          }
          else if (typeof matches.test === 'function') {
            isMatch = matches.test(path);
          }

          if (isMatch) {
            matchingRules.push(fn);
          }
        }

        // add any matching deprecated pointcuts
        // deprecated
        each(deprecatedPointcuts, function (depPC) {
          found = false;
          each(matchingRules, function (normalPC) {
            if (normalPC === depPC) {
              found = true;
            }
          });
          if (!found) {
            matchingRules.push(depPC);
          }
        });
        // end deprecated

        this.caches.contentRules[path] = matchingRules;
        return matchingRules;
      },

      /**
       * Dismantles and reassembles a relative path by exploding on slashes
       * @method RulesEngine.getRelative
       * @param {String} id - the initial identifier
       * @param {String} base - the base path for relative declarations
       * @private
       * @returns {String} a resolved path with no relative references
       */
      getRelative: function (id, base) {
        var blownApartURL;
        var resolved = [];
        var piece;

        base = base || '';

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
              throw new Error('could not traverse higher than highest path: ' + id + ', ' + base);
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
      }
    };
  });
  RulesEngine = new AsStatic();
})();
