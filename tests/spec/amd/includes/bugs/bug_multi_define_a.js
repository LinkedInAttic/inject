ok(false, "external bar should not load");

define("bug_multi_define_a", function(){
  ok(false, "external bar should not run");
});
