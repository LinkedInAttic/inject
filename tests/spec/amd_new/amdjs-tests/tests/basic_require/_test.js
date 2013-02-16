go(     ['require', 'a'],
function (require) {
  require(['b', 'c'],
  function (b,   c) {

    amdJS.group('basic_require');

    amdJS.assert('a' === require('a').name, 'require a.name');
    amdJS.assert('b' === b.name, 'b.name');
    amdJS.assert('c' === c.name, 'c.name');
    amdJS.assert(/c\/templates\/first\.txt$/.test(c.url), 'c.url property');

    amdJS.done();
  });
});
