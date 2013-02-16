go(     ['car'],
function (car) {

  amdJS.group('cjs_named');

  amdJS.assert('car' === car.name, 'car.name');
  amdJS.assert('wheels' === car.wheels.name, 'car.wheels.name');
  amdJS.assert('engine' === car.engine.name, 'car.engine.name');

  amdJS.done();

});
