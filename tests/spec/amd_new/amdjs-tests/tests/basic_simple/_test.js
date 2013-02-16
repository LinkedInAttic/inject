go(     ['a', 'b'],
function (a,   b) {

  amdJS.group('basic_simple');

  amdJS.assert('a' === a.name, 'a.name');
  amdJS.assert('b' === b.name, 'b.name');
  amdJS.assert('c' === b.cName, 'c.name via b');

  amdJS.done();
});
