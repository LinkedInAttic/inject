// query-string
asyncTest('#199 addRule\'s path statement affects URLs and not Module IDs', 3, function() {
  Inject.addRule(/^peer\-.+$/, {
    path: function(name) {
      return 'test/'+name;
    }
  });
  require.run('root');
});