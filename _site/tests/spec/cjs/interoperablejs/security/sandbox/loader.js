
exports.Loader = function () {
    return {
        'resolve': function (id) {return id},
        'load': function (id) {
            return function (require, exports) {
                exports.foo = function () {
                    return 2;
                };
            }
        }
    }
};

