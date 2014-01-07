
exports.Sandbox = function (loader, environment, modules) {
    if (!modules) modules = {};
    if (!env) env = environment;
    var sandbox = function (id, baseId) {

        id = loader.resolve(id, baseId);

        /* populate memo with module instance */
        if (!modules.hasOwnProperty(id)) {
            var factory = loader.load(id);
            var exports = modules[id] = {};
            var require = Require(id);
            factory(require, exports, env);
        }

        /* snapshot exports with requested bound methods */
        var exports = modules[id];
        var imports = {};
        for (var name in exports) {
            if (exports.hasOwnProperty(name)) {
                if (exports[name].curryId) {
                    imports[name] = (function (unbound) {
                        return function () {
                            return unbound.apply(
                                this,
                                [baseId].concat(Array.prototype.slice(arguments, 0))
                            );
                        };
                    })(exports[name]);
                } else {
                    imports[name] = exports[name];
                }
            }
        }

        return imports;
    };

    var Require = function (baseId) {
        var require = function (id) {
            try {
                return sandbox(id, baseId);
            } catch (exception) {
                if (!exception.message)
                    exception.message = 'Error';
                try {
                    try {
                        eval("throw new Error()");
                    } catch (deliberate) {
                        if (deliberate.lineNumber !== undefined)
                            exception.message += ' at ' + (exception.lineNumber - deliberate.lineNumber + 1);
                    }
                    exception.message += ' in ' + baseId;
                } catch (ignore) {
                }
                throw exception;
            }
        };
        environment = env;
        require.id = baseId;
        require.loader = loader;
        require.curryId = function (callback) {
            callback.curryId = true;
            return callback;
        };
        require.isLoaded = function (id) {
            return modules.hasOwnProperty(urls.resolve(id, baseId));
        };
        return require;
    };

    return sandbox;
};

