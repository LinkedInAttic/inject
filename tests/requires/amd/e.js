define(['exports', 'a'], function(exports, a) {
  var name = a.name + " from anon define";
  
  ok(true, "anon define loaded");
});