// #240 anon defines
test("#240 fail gracefully when an anonymous define is used out of context - AMD", function() {
  var pass = false;
  try {
    define(function() {});
  }
  catch(e) {
    if (e instanceof Error && /AMD/.test(e.message)) {
      pass = true;
    }
  }
  ok(pass, "Properly throws an AMD related error as opposed to an untracable issue.");
});
