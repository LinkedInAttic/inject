go(     ['refine!a'],
function (a) {

  amdJS.group('plugin_fromtext');
  amdJS.assert('a' === a.name, 'a.name');
  amdJS.done();

});
