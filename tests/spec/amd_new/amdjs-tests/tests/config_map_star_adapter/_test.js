/*global doh */
config({
  baseUrl: './',
  map: {
    '*': {
      'd': 'adapter/d'
    },
    'adapter/d': {
      d: 'd'
    }
  }
});

go(    ['e', 'adapter/d'],
function(e,   adapterD) {
  'use strict';

  amdJS.group('config_map_star_adapter');
  amdJS.assert('e' === e.name, 'e.name');
  amdJS.assert('d' === e.d.name, 'e.d.name');
  amdJS.assert(e.d.adapted, 'e.d.adapted');
  amdJS.assert(adapterD.adapted, 'adapterD.adapted');
  amdJS.assert('d' === adapterD.name, 'adapterD.name');
  amdJS.done();

});
