go(     ['require', 'earth', 'prime/earth'],
function (require,   earth,   primeEarth) {

  amdJS.group('plugin_normalize');
  amdJS.assert('a' === earth.getA().name, 'earth.getA().name');
  amdJS.assert('c' === earth.getC().name, 'earth.getC().name');
  amdJS.assert('b' === earth.getB().name, 'earth.getB().name');
  amdJS.assert('aPrime' === primeEarth.getA().name, 'primeEarth.getA().name is aPrime, not a');
  amdJS.assert('cPrime' === primeEarth.getC().name, 'primeEarth.getC().name is cPrime, not c');
  amdJS.assert('bPrime' === primeEarth.getB().name, 'primeEarth.getB().name is bPrime, not b');
  amdJS.done();

});
