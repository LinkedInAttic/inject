config({
  paths: {
    "array": "impl/array"
  }
});

go(     ["require", "array"],
function( require,   array) {

  amdJS.group('anon_relative');

  amdJS.assert('impl/array' === array.name, 'array.name');
  amdJS.assert('util' === array.utilName, 'relative to module ID, not URL');

  amdJS.done();

});
