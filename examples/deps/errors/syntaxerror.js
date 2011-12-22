if (console && typeof(console.log) === "function") {
  console.log("error file executing");
}
// this file contains a syntax error
// it's used to show how line numbers are preserved for errors
function itemOne() {
  var foo = "bar";
  foo = 1 + 2;
}

var use = true;

var barTwo = function() {
  // here is the syntax error
  if (use) {
    // no closing semi colon
};

exports.test = true
