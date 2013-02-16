config({
  baseUrl: '.',
  paths: {
    'foo/b': 'alternate/b',
    'foo/b/c': 'elsewhere/c'
  }
});

go(     ['foo', 'foo/b', 'foo/b/c', 'bar', 'bar/sub'],
function (foo,   fooB,    fooC,      bar,   barSub) {

  amdJS.group('config_paths');

  amdJS.assert('foo' === foo.name, 'foo.name');
  amdJS.assert('fooB' === fooB.name, 'fooB.name');
  amdJS.assert('fooC' === fooC.name, 'fooC.name');
  amdJS.assert('bar' === bar.name, 'bar.name');
  amdJS.assert('barSub' === barSub.name, 'barSub.name');

  amdJS.done();

});