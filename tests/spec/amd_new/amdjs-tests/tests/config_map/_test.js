config({
  baseUrl: './',
  paths: {
    a: 'a1'
  },
  map: {
    'a': {
      c: 'c1'
    },
    'a/sub/one': {
      'c': 'c2'
    }
  }
});

go(    ['a', 'b', 'c', 'a/sub/one'],
function(a,   b,   c,   one) {
  amdJS.group('config_map');
  amdJS.assert('c1' === a.c.name, 'a.c.name');
  amdJS.assert('c1/sub' === a.csub.name, 'a.csub.name');
  amdJS.assert('c2' === one.c.name, 'one.c.name');
  amdJS.assert('c2/sub' === one.csub.name, 'one.csub.name');
  amdJS.assert('c' === b.c.name, 'b.c.name');
  amdJS.assert('c/sub', b.csub.name, 'b.csub.name');
  amdJS.assert('c' === c.name, 'c.name');
  amdJS.done();
});
