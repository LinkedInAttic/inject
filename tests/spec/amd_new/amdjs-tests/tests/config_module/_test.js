config({
  baseUrl: './',
  config: {
    a: {
      id: 'magic'
    },
    'b/c': {
      id: 'beans'
    }
  }
});

go(    ['a', 'b/c', 'plain'],
function(a,   c,     plain) {
  amdJS.group('config_module');
  amdJS.assert('magic' === a.type, 'a.type is magic');
  amdJS.assert('beans' === c.food, 'c.food is beans');
  amdJS.assert('plain' === plain.id, 'module.id is defined');
  amdJS.done();
});
