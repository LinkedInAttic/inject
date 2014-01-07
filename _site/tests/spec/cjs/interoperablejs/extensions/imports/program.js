var test = require('test');
try {
    include('foo');
    test.assert(foo() == 1, 'imports bound in local scope');
} catch (exception) {
    print('ERROR ' + exception, 'error');
}
test.print('DONE', 'info');
