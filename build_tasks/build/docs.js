var Seq = require("seq");
var bu = require("../util");
var path = require("path");
exports.task = function(options) {
  return function () {
    require("util").log("Building documentation");
    // this == next build step
    // master file
    var docs = options.docs;
    var src = options.src;
    var next = this;
    bu.JSDoc(src, docs, next);
  };
};