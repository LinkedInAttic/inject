define("foo", ["bug_multi_define_a"], function() {
  // noop, just gets a bar
});

define("bug_multi_define_a", function() {
  ok("inline bar ran");
});