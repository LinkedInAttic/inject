/*jslint strict: false */
/*global require: false, doh: false */

go(     ['pillow', 'sub/blanket'],
function (pillow,   blanket) {

  pillow.delayed(function (resource) {
    amdJS.group('plugin_dynamic');

    amdJS.assert(resource !== pillow.resource, 'resource and pillow.resource should have different names');
    amdJS.assert(blanket.pillowResource !== pillow.resource, 'blanket.pillowResource and pillow.resource should have different names');
    amdJS.assert(resource !== blanket.pillowResource, 'resource and blanket.pillowResource should have different names');

    //Make sure the paths after the counter ID are not relative.
    amdJS.assert(resource.split(':')[1].indexOf('./pillow') === -1, 'after the counter ID for resource, path is not relative');
    amdJS.assert(pillow.resource.split(':')[1].indexOf('./pillow') === -1, 'after the counter ID for pillow.resource, path is not relative');
    amdJS.assert(blanket.pillowResource.split(':')[1].indexOf('../pillow') === -1, 'after the counter ID for blanket.pillowResource, path is not relative');
    amdJS.assert(blanket.resource.split(':')[1].indexOf('./blanket') === -1, 'after the counter ID for blanket.resource, path is not relative');

    amdJS.done();
  });

});
