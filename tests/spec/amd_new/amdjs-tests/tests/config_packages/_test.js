config({
  baseUrl: './',
  paths: {
    'alpha/replace' : 'replace'
  },
  packages: [
    {
      name: 'alpha',
      location: 'pkgs/alpha'
    },
    {
      name: 'beta',
      location: 'pkgs/beta/0.2/scripts',
      main: 'beta'
    },
    {
      name: 'dojox/chair',
      location: 'pkgs/dojox/chair'
    },
    {
      name: 'dojox/table',
      location: 'pkgs/dojox/table',
      main: 'table'
    },
    {
      name: 'bar',
      location: 'bar/0.4',
      main: 'scripts/main'
    },
    {
      name: 'foo',
      location: 'foo/lib'
    },
    {
      name: 'funky',
      main: 'index.js'
    },
    {
      name: 'baz',
      location: 'baz/lib',
      main: 'index'
    },
    {
      name: 'dojox/window',
      location: 'dojox/window',
      main: 'window'
    }
  ]
});

go(    ["require", "alpha", "alpha/replace", "beta", "beta/util", "bar", "baz",
        "foo", "foo/second", "dojox/chair", "dojox/table", "dojox/door",
        "dojox/window/pane", "dojox/window", "dojox/table/legs", "funky"],
function(require,   alpha,   replace,         beta,   util,        bar,   baz,
         foo,   second,       chair,         table,         door,
         pane,                window,         legs,               funky) {

  amdJS.group('config_packages');

  amdJS.assert('alpha' === alpha.name, 'alpha.name');
  amdJS.assert('fake/alpha/replace' === replace.name, 'replace.name');
  amdJS.assert('beta' === beta, 'beta');
  amdJS.assert('beta/util' === util.name, 'util.name');
  amdJS.assert('bar' === bar.name, 'bar.name');
  amdJS.assert('0.4' === bar.version, 'bar.version');
  amdJS.assert('baz' === baz.name, 'baz.name');
  amdJS.assert('0.4' === baz.barDepVersion, 'baz.barDepVersion');
  amdJS.assert('foo' === baz.fooName, 'baz.fooName');
  amdJS.assert('baz/helper' === baz.helperName, baz.helperName);
  amdJS.assert('foo' === foo.name, 'foo.name');
  amdJS.assert('alpha' === foo.alphaName, 'foo.alphaName');
  amdJS.assert('foo/second' === second.name, 'second.name');
  amdJS.assert('dojox/chair' === chair.name, 'chair.name');
  amdJS.assert('dojox/chair/legs' === chair.legsName, 'chair.legsName');
  amdJS.assert('dojox/table' === table.name, 'table.name');
  amdJS.assert('dojox/chair' === table.chairName, 'table.chairName');
  amdJS.assert('dojox/table/legs' === legs.name, 'legs.name');
  amdJS.assert('dojox/door' === door.name, 'door.name');
  amdJS.assert('dojox/window/pane' === pane.name, 'pane.name');
  amdJS.assert('dojox/window' === window.name, 'window.name');
  amdJS.assert('dojox/window/pane' === window.paneName, 'window.paneName');
  amdJS.assert('funky' === funky.name, 'funky.name');
  amdJS.assert('monkey' === funky.monkeyName, 'funky.monkeyName');

  amdJS.done();
});
