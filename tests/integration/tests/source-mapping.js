// source-mapping
asyncTest("Enable Source Map (if supported)", 1, function() {
  Inject.enableSourceUrls();
  require.run("sourcemap");
});