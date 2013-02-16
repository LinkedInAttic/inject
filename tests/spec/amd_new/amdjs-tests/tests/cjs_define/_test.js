go(     ['one', 'two', 'three'],
function (one,   two,   three) {

  var args = two.doSomething(),
      oneMod = two.getOneModule();

  amdJS.group('cjs_define');

  amdJS.assert('large' === one.size, 'one.size');
  amdJS.assert('small' === two.size, 'two.size');
  amdJS.assert('small' === args.size, 'args.size');
  amdJS.assert('redtwo' === args.color, 'args.color');
  amdJS.assert('one' === oneMod.id, 'module.id property support');
  amdJS.assert('three' === three.name, 'three.name');
  amdJS.assert('four' === three.fourName, 'four.name via three');
  amdJS.assert('five' === three.fiveName, 'five.name via four');

  amdJS.done();

});
