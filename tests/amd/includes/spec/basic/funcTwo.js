define("funcTwo", ["require", "funcOne"], function (require) {
  var funcOne = require('funcOne');
  var two = function (name) {
    this.name = name;
    this.one = new funcOne("ONE");
  };

  two.prototype.oneName = function () {
    return this.one.getName();
  };

  return two;
});