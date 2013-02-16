config({
  baseUrl: './',
  paths: {
    a: 'a1'
  },

  map: {
    '*': {
      'c': 'another/c'
    },
    'a': {
      c: 'c1'
    },
    'a/sub/one': {
      'c': 'c2',
      'c/sub': 'another/c/sub'
    }
  }
});
go(    ['a', 'b', 'c', 'a/sub/one'],
function(a,   b,   c,   one) {

  amdJS.group('config_map_star');
  amdJS.assert('c1' === a.c.name, 'a.c.name');
  amdJS.assert('c1/sub' === a.csub.name, 'a.csub.name');
  amdJS.assert('c2' === one.c.name, 'one.c.name');
  amdJS.assert('another/c/sub' === one.csub.name, 'one.csub.name');
  amdJS.assert('another/c/dim' === one.csub.dimName, 'one.csub.dimName');
  amdJS.assert('another/c' === b.c.name, 'b.c.name');
  amdJS.assert('another/minor' === b.c.minorName, 'b.c.minorName');
  amdJS.assert('another/c/sub' === b.csub.name, 'b.csub.name');
  amdJS.assert('another/c' === c.name, 'c.name');
  amdJS.assert('another/minor' === c.minorName, 'c.minorName');
  amdJS.done();

});
