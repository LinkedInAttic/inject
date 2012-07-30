exports.runTest = function(includeSubfile) {
  var count = 2;
  
  function doStart() {
    if (--count === 0) {
      start();
    }
  }
  
  // runtime subfile
  if (includeSubfile) {
    require.ensure(["bug_58_a"], function() {
      ok(true, "58_a ran");
      doStart();
    });
  }
  else {
    doStart();
  }
  
  ok(true, "58 main loaded");
  doStart();
}