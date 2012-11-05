// source-mapping
asyncTest("Enable Source Map (if supported)", 1, function() {
  Inject.enableDebug("sourceMap");
  require.run("sourcemap");
});