
exports.print = function () {
    if (typeof print !== "undefined")
      print.apply(undefined, arguments);
    else {
      var stdout = require('system').stdout;
      stdout.print.apply(stdout, arguments);
    }
};

exports.assert = function (guard, message) {
    if (guard) {
        exports.print('PASS ' + message, 'pass');
    } else {
        exports.print('FAIL ' + message, 'fail');
    }
};

