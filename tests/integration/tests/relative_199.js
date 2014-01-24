// query-string
asyncTest('#199 addRule\'s path statement affects URLs and not Module IDs', 3, function() {
  Inject.addFileRule(/^peer\-.+$/, function(name) {
    return 'test/'+name;
  });
  require.run('root');
});