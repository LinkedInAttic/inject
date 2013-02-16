go(    ["require", "two", "funcTwo", "funcThree"],
function(require,   two,   funcTwo,   funcThree) {
  var args = two.doSomething(),
      twoInst = new funcTwo("TWO"),
      oneMod = two.getOneModule();

  amdJS.group('anon_circular');

  amdJS.assert('small' === args.size, 'args.size');
  amdJS.assert('redtwo' === args.color, 'args.color');
  amdJS.assert('one' === oneMod.id, 'module.id property supported');

  amdJS.assert('TWO' === twoInst.name, 'instantiated objects');
  amdJS.assert('ONE-NESTED' === twoInst.oneName(), 'nested objects');
  amdJS.assert('THREE-THREE_SUFFIX' === funcThree('THREE'), 'resolved circular references');

  amdJS.done();

});
