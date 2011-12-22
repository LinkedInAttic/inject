// this file is an error that calls an undefined function

function foo() {
  
}

var bar = function() {
  baz();
};

// this is some more code
foo();

baz();

exports.biz = "boz";