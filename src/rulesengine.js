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

  var LEADING_SLASHES_REGEX = /^\/+/g;

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

      clearRules: function() {
        this.moduleRules = [];
        this.fileRules = [];
        this.contentRules = [];
        this.fetchRules = [];
        this.aliasRules = {};
        this.dirty = {
          moduleRules: true,
          fileRules: true,
          contentRules: true,
          fetchRules: true,
          aliasRules: true
        };
        this.caches = {
          moduleRules: {},
          fileRules: {},
          contentRules: {},
          fetchRules: {},
          aliasRules: {}
        };
        this.addRuleCounter = 0;
        this.addRulePointcuts = {};
      },

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

      clearCache: function(type) {
        this.caches[type] = {};
      },

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
       * @deprecated
       */
      getDeprecatedPointcuts: function(moduleId) {
        return this.addRulePointcuts[moduleId] || [];
      },

      /**
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

      addModuleRule: function (matchesId, rule, options) {
        return this.add('moduleRules', matchesId, rule, options);
      },
      addFileRule: function (matchesPath, rule, options) {
        return this.add('fileRules', matchesPath, rule, options);
      },
      addContentRule: function (matchesPath, rule, options) {
        return this.add('contentRules', matchesPath, rule, options);
      },
      addFetchRule: function (matchesId, rule, options) {
        return this.add('fetchRules', matchesId, rule, options);
      },
      addPackage: function (matchesResolvedId, rule) {
        return this.add('aliasRules', matchesResolvedId, rule);
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
        var deprecatedPointcuts = [];
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
            if (rules[i].all && rules[i].all.afterFetch) {
              deprecatedPointcuts.push(rules[i].all.afterFetch);
            }
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
          this.addRulePointcuts[lastPath] = deprecatedPointcuts;

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
        this.addRulePointcuts[lastPath] = deprecatedPointcuts;

        // store and return
        this.caches.fileRules[path] = lastPath;
        return lastPath;
      },

      getPackages: function (resolvedId) {
        // if (!this.dirty.aliasRules && this.caches.aliasRules[resolvedId]) {
        //   return this.caches.aliasRules[resolvedId];
        // }

        this.sort('aliasRules');
        var i = 0;
        var rules = this.aliasRules;
        var len = rules.length;
        var isMatch = false;
        var matches;
        var fn;
        var aliases = [];
        for (i; i < len; i++) {
          matches = rules[i].matches;
          fn = rules[i].fn;

          isMatch = false;
          if (typeof matches === 'string') {
            if (matches === resolvedId) {
              isMatch = true;
            }
          }
          else if (typeof matches.test === 'function') {
            isMatch = matches.test(resolvedId);
          }

          if (isMatch) {
            aliases.push(fn(resolvedId));
          }
        }

        this.caches.aliasRules[resolvedId] = aliases;
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
        var deprecatedPointcuts = this.addRulePointcuts[path] || [];
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
