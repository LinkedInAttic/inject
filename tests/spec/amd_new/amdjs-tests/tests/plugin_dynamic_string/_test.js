/*jslint strict: false */
/*global go, doh */

go(     ['mattress'],
function (mattress) {
  amdJS.group('plugin_dynamic_string');
  //Make sure the resource names do not match for the
  //three kinds of pillow-related resources.
  amdJS.assert('mattress' === mattress.name, 'mattress.name is unique');
  amdJS.assert('1:medium' === mattress.id1, 'mattress.id1 is unique');
  amdJS.assert('2:medium' === mattress.id2, 'mattress.id2 is unique');
  amdJS.done();

});
