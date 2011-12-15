define("funcOne", ["require", "funcTwo"], function (require) {
  var one = function (name) {
    this.name = name;
  };
  one.prototype.getName = function () {
    var funcTwo = require("funcTwo");
    var inst = new funcTwo("-NESTED");
    return this.name + inst.name;
  };

  return one;
});