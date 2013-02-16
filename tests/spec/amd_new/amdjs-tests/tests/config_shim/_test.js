config({
  baseUrl: './',
  shim: {
    a: {
      exports: 'A.name',
      init: function () {
        window.globalA = this.A.name;
      }
    },
    'b': ['a', 'd'],
    'c': {
      deps: ['a', 'b'],
      exports: 'C'
    },
    'e': {
      exports: 'e.nested.e',
      init: function () {
        return {
          name: e.nested.e.name + 'Modified'
        };
      }
    },
    'f': {
      deps: ['a'],
      init: function (a) {
        return {
          name: FCAP.name,
          globalA: FCAP.globalA,
          a: a
        };
      }
    }
  }
});

go(    ['a', 'c', 'e', 'f'],
function(a,   c,   e,   f) {

  amdJS.group('config_shim');
  amdJS.assert('a' === a, 'a');
  amdJS.assert('a' === window.globalA, 'window.globalA');
  amdJS.assert('a' === c.b.aValue, 'c.b.aValue');
  amdJS.assert('b' === c.b.name, 'c.b.name');
  amdJS.assert('c' === c.name, 'c.name');
  amdJS.assert('d' === c.b.dValue.name, 'c.b.dValue.name');
  amdJS.assert('eModified' === e.name, 'e.name');
  amdJS.assert('FCAP' === f.name, 'f.name');
  amdJS.assert('a' === f.globalA.name, 'f.globalA.name');
  amdJS.assert('a' === f.a, 'f.a');
  amdJS.done();

});
