//
// math.js
//

exports.add = function() {
  var sum = arguments[0];
  for (var i=1; i<arguments.length; i++) {
    sum += arguments[i];   }
  return sum;
};
