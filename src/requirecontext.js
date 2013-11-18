/*global context:true */
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
 * RequireContext is an instance object which provides the
 * CommonJS and AMD interfaces of require(string),
 * require(array, callback) ensure (require.ensure),
 * run (require.run), and define.
 * @file
**/
var RequireContext = Fiber.extend(function () {
  return {
    /**
     * Creates a new RequireContext
     * @constructs RequireContext
     * @param {String} id - the current module ID for this context
     * @param {String} path - the current module URL for this context
     * @param {String} qualifiedId - a (from)-joined collection of paths
     * @public
     */
    init: function (id, path, qualifiedId) {
      this.id = id || null;
      this.path = path || null;
      this.qualifiedId = qualifiedId || null;
    },

    /**
     * Log an operation for this context
     * @method RequireContext#log
     * @param {String} message - the message to log
     * @protected
     */
    log: function (message) {
      debugLog('RequireContext for ' + this.path, message);
    },

    /**
     * get the path associated with this context
     * @method RequireContext#getPath
     * @public
     * @returns {String} the path for the current context
     */
    getPath: function () {
      if (!userConfig.moduleRoot) {
        throw new Error('moduleRoot must be defined. Please use Inject.setModuleRoot()');
      }
      return this.path || userConfig.moduleRoot;
    },

    /**
     * get the ID associated with this context
     * @method RequireContext#getId
     * @public
     * @returns {String} the id of the current context
     */
    getId: function () {
      return this.id || '';
    },

    /**
     * The CommonJS and AMD require interface<br>
     * CommonJS: <strong>require(moduleId)</strong><br>
     * AMD: <strong>require(moduleList, callback)</strong>
     * @method RequireContext#require
     * @param {String|Array} moduleIdOrList - a string (CommonJS) or Array (AMD) of modules to include
     * @param {Function} callback - a callback (AMD) to run on completion
     * @public
     * @returns {Object|null} the object at the module ID (CommonJS) or null (AMD)
     * @see <a href="http://wiki.commonjs.org/wiki/Modules/1.0">http://wiki.commonjs.org/wiki/Modules/1.0</a>
     * @see <a href="https://github.com/amdjs/amdjs-api/wiki/require">https://github.com/amdjs/amdjs-api/wiki/require</a>
     */
    require: function (moduleIdOrList, callback) {
      var module;
      var identifier;
      var assignedModule;
      var qualifiedId;

      if (typeof(moduleIdOrList) === 'string') {
        this.log('CommonJS require(string) of ' + moduleIdOrList);
        if (/^[\d]+$/.test(moduleIdOrList)) {
          throw new Error('require() must be a string containing a-z, slash(/), dash(-), and dots(.)');
        }

        // try to get the module a couple different ways
        identifier = RulesEngine.resolveModule(moduleIdOrList, this.getId());
        qualifiedId = RequireContext.qualifiedId(identifier, this.qualifiedId);

        // try the qualified path if we had a qualified ID
        if (qualifiedId) {
          module = Executor.getModule(qualifiedId);
        }
        
        // if we still don't have a module from a qualified path, try a direct get
        if (!module) {
          module = Executor.getModule(identifier);
        }
        
        // still no module means it was never seen in a loading path
        if (!module) {
          throw new Error('module ' + moduleIdOrList + ' is not available');
        }
        
        // if the module has an error, we need to throw it
        if (module.__error) {
          throw module.__error;
        }
        
        // now it's safe to return the exports
        return module.exports;
      }

      // AMD require
      this.log('AMD require(Array) of ' + moduleIdOrList.join(', '));
      var resolved = [];
      this.ensure(moduleIdOrList, proxy(function (localRequire) {
        for (var i = 0, len = moduleIdOrList.length; i < len; i++) {
          switch(moduleIdOrList[i]) {
          case 'require':
            resolved.push(localRequire);
            break;
          case 'module':
          case 'exports':
            throw new Error('require(array, callback) doesn\'t create a module. You cannot use module/exports here');
          default:
            resolved.push(localRequire(moduleIdOrList[i]));
          }
        }
        callback.apply(context, resolved);
      }, this));
    },

    /**
     * the CommonJS require.ensure interface based on the async/a spec
     * @method RequireContext#ensure
     * @param {Array} moduleList - an array of modules to load
     * @param {Function} callback - a callback to run when all modules are loaded
     * @public
     * @see <a href="http://wiki.commonjs.org/wiki/Modules/Async/A">http://wiki.commonjs.org/wiki/Modules/Async/A</a>
     */
    ensure: function (moduleList, callback) {
      if (Object.prototype.toString.call(moduleList) !== '[object Array]') {
        throw new Error('require.ensure() must take an Array as the first argument');
      }

      this.log('CommonJS require.ensure(array) of ' + moduleList.join(', '));

      // strip builtins (CommonJS doesn't download or make these available)
      moduleList = Analyzer.stripBuiltins(moduleList);

      var require = proxy(this.require, this);
      this.process(moduleList, function(root) {
        if (typeof callback == 'function') {
          callback(require);
        }
      });
    },

    /**
     * Run a module as a one-time approach. This is common verbage
     * in many AMD based systems
     * @method RequireContext#run
     * @param {String} moduleId - the module ID to run
     * @public
     */
    run: function (moduleId) {
      this.log('AMD require.run(string) of ' + moduleId);
      this.ensure([moduleId]);
    },

    /**
     * Define a module with its arguments. Define has multiple signatures:
     * <ul>
     *  <li>define(id, dependencies, factory)</li>
     *  <li>define(id, factory)</li>
     *  <li>define(dependencies, factory)</li>
     *  <li>define(factory)</li>
     * </ul>
     * @method RequireContext#define
     * @param {string} id - if provided, the name of the module being defined
     * @param {Array} dependencies - if provided, an array of dependencies for this module
     * @param {Object|Function} factory - an object literal that defines the module or a function to run that will define the module
     * @public
     * @see <a href="https://github.com/amdjs/amdjs-api/wiki/AMD">https://github.com/amdjs/amdjs-api/wiki/AMD</a>
     */
    define: function () {
      var args = Array.prototype.slice.call(arguments, 0);
      var id = null;
      var dependencies = ['require', 'exports', 'module'];
      var dependenciesDeclared = false;
      var factory = {};
      var remainingDependencies = [];
      var resolvedDependencyList = [];
      var tempModuleId = null;

      // these are the various AMD interfaces and what they map to
      // we loop through the args by type and map them down into values
      // while not efficient, it makes this overloaed interface easier to
      // maintain
      var interfaces = {
        'string array object': ['id', 'dependencies', 'factory'],
        'string object':       ['id', 'factory'],
        'array object':        ['dependencies', 'factory'],
        'object':              ['factory']
      };
      var key = [];
      var value;
      var i;
      for (i = 0, len = args.length; i < len; i++) {
        if (Object.prototype.toString.apply(args[i]) === '[object Array]') {
          key.push('array');
        }
        else if (typeof(args[i]) === 'object' || typeof(args[i]) === 'function') {
          key.push('object');
        }
        else {
          key.push(typeof(args[i]));
        }
      }
      key = key.join(' ');

      if (!interfaces[key]) {
        throw new Error('You did not use an AMD compliant interface. Please check your define() calls');
      }

      key = interfaces[key];
      for (i = 0, len = key.length; i < len; i++) {
        value = args[i];
        switch (key[i]) {
        case 'id':
          id = value;
          break;
        case 'dependencies':
          dependencies = value;
          dependenciesDeclared = true;
          break;
        case 'factory':
          factory = value;
          break;
        }
      }

      // handle anonymous modules
      if (!id) {
        currentExecutingAMD = Executor.getCurrentExecutingAMD();
        if (currentExecutingAMD) {
          id = currentExecutingAMD.id;
        }
        else {
          throw new Error('Anonymous AMD module used, but it was not included as a dependency. This is most often caused by an anonymous define() from a script tag.');
        }
        this.log('AMD identified anonymous module as ' + id);
      }      
      
      this.process(id, dependencies, function(root) {
        // don't bobther with the artificial root we created
        if (!root.data.resolvedId) {
          return;
        }
        // all modules have been ran, now to deal with this guy's args
        var resolved = [];
        var deps = (dependenciesDeclared) ? dependencies : ['require', 'exports', 'module'];
        var require = RequireContext.createRequire(root.data.resolvedId, root.data.resolvedUrl);
        var module = Executor.createModule(root.data.resolvedId, RequireContext.qualifiedId(root), root.data.resolvedUrl);
        var result;
        for (var i = 0, len = deps.length; i < len; i++) {
          switch(deps[i]) {
          case 'require':
            resolved.push(require);
            break;
          case 'module':
            resolved.push(module);
            break;
          case 'exports':
            resolved.push(module.exports);
            break;
          default:
            resolved.push(require(deps[i]));
          }
        }
        if (typeof factory === 'function') {
          result = factory.apply(module, resolved);
          if (result) {
            module.exports = result;
          }
        }
        else if (typeof factory === 'object') {
          module.exports = factory;
        }
        module.amd = true;
        module.exec = true;
      });
    },
    
    /**
     * Process all the modules selected by the various CJS / AMD interfaces
     * builds a tree to handle the dependency download and execution
     * upon completion, calls the provided callback, returning the root node
     * @method RequireContext#process
     * @param {Array} dependencies - an array of dependencies to process
     * @param {Function} callback - a function called when the module tree is downloaded and processed
     * @private
     */
    process: function(id, dependencies, callback) {
      if (typeof id !== 'string') {
        callback = dependencies;
        dependencies = id;
        id = this.id;
      }
      
      var root = new TreeNode();
      var count = dependencies.length;
      var node;
      var runner;
      var runners = [];
      var resolveCount = function() {
        if (count === 0 || --count === 0) {
          runner = new TreeRunner(root);
          runner.execute(function() {
            callback(root);
          });
        }
      };
      root.data.originalId = id;
      root.data.resolvedId = id;
      root.data.resolvedUrl = RulesEngine.resolveFile(id, this.path);
      
      if (dependencies.length) {
        for (i = 0, len = dependencies.length; i < len; i++) {
          if (BUILTINS[dependencies[i]]) {
            resolveCount();
            continue;
          }
          
          // add the node always at this point, we just may not need
          // to download it.
          node = new TreeNode();
          node.data.originalId = dependencies[i];
          root.addChild(node);
          
          if (Executor.getModule(dependencies[i])) {
            resolveCount();
            continue;
          }
          else if (Executor.getModule(RequireContext.qualifiedId(node))) {
            resolveCount();
            continue;
          }
          else {
            runner = new TreeRunner(node);
            runners.push(runner);
            runner.download(resolveCount);
          }
        }
      }
      else {
        resolveCount();
      }
    }
  };
});

/**
 * create a require() method within a given context path
 * relative require() calls can be based on the provided
 * id and path
 * @method RequireContext.createRequire
 * @param {string} id - the module identifier for relative module IDs
 * @param {string} path - the module path for relative path operations
 * @public
 * @returns a function adhearing to CommonJS and AMD require()
 */
RequireContext.createRequire = function (id, path, qualifiedId) {
  var req = new RequireContext(id, path, qualifiedId);
  var require = proxy(req.require, req);

  require.ensure = proxy(req.ensure, req);
  require.run = proxy(req.run, req);
  // resolve an identifier to a URL (AMD compatibility)
  require.toUrl = function (identifier) {
    var resolvedId = RulesEngine.resolveModule(identifier, id);
    var resolvedPath = RulesEngine.resolveFile(resolvedId, path, true);
    return resolvedPath;
  };
  return require;
};

/**
 * create a define() method within a given context path
 * relative define() calls can be based on the provided
 * id and path
 * @method RequireContext.createDefine
 * @param {string} id - the module identifier for relative module IDs
 * @param {string} path - the module path for relative path operations
 * @param {boolean} disableAMD - if provided, define.amd will be false, disabling AMD detection
 * @public
 * @returns a function adhearing to the AMD define() method
 */
RequireContext.createDefine = function (id, path, disableAMD) {
  var req = new RequireContext(id, path);
  var define = proxy(req.define, req);
  define.amd = (disableAMD) ? false : {};
  return define;
};

/**
 * generate a Qualified ID
 * A qualified ID behaves differently than a module ID. Based on it's parents,
 * it refers to the ID as based on the chain of modules that were executed to
 * invoke it. While this may be a reference to another module, a qualified ID is
 * the real source of truth for where a module may be found
 * @method RequireContext.qualifiedId
 * @public
 * @param {Object} rootOrId - either a {TreeNode} or {String} representing the current ID
 * @param {String} qualifiedId - if provided, the qualfied ID is used instead of parent references
 * @returns {String}
 */
RequireContext.qualifiedId = function(rootOrId, qualifiedId) {
  var out = [];
  
  if (typeof rootOrId === 'string') {
    if (qualifiedId) {
      return [rootOrId, qualifiedId].join('(from)');
    }
    else {
      return rootOrId;
    }
  }
  else {
    rootOrId.parents(function(node) {
      if (node.data.resolvedId) {
        out.push(node.data.resolvedId);
      }
    });
    return out.join('(from)');
  }
};

/**
 * Creates a synchronous define() function as used inside of the Inject Sandbox
 * Unlike a global define(), this local define already has a module context and
 * a local require function. It is used inside of the sandbox because at
 * execution time, it's assumed all dependencies have been resolved. This is
 * a much lighter version of RequireContext#define
 * @method RequireContext.createInlineDefine
 * @public
 * @param {Object} module - a module object from the Executor
 * @param {Function} require - a synchronous require function
 * @returns {Function}
 */
RequireContext.createInlineDefine = function(module, require) {
  var define = function() {
    // this is a serial define and is no longer functioning asynchronously',
    function isArray(a) {
      return (Object.prototype.toString.call(a) === '[object Array]');
    }
    var deps = [];
    var depends = ['require', 'exports', 'module'];
    var factory = {};
    var result;
    for (var i = 0, len = arguments.length; i < len; i++) {
      if (isArray(arguments[i])) {
        depends = arguments[i];
        break;
      }
    }
    factory = arguments[arguments.length - 1];
    for (var d = 0, dlen = depends.length; d < dlen; d++) {
      switch(depends[d]) {
      case 'require':
        deps.push(require);
        break;
      case 'module':
        deps.push(module);
        break;
      case 'exports':
        deps.push(module.exports);
        break;
      default:
        deps.push(require(depends[d]));
      }
    }
    if (typeof factory === 'function') {
      result = factory.apply(module, deps);
      if (result) {
        module.exports = result;
      }
    }
    else if (typeof factory === 'object') {
      module.exports = factory;
    }
    module.amd = true;
    module.exec = true;
  };
  define.amd = {};
  return define;
};
