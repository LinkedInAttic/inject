var test = require('test');
exports.foo = function () {
    return 1;
};
try {
    test.assert(foo() == 1, 'exports bound in local scope');
} catch (exception) {
    test.print('ERROR ' + exception, 'error');
}
test.print('DONE', 'info');
