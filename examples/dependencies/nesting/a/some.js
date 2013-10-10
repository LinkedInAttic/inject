define('a/some', ['b/more', 'win/proxy'], function(more, proxy) {
  window.TREE.push('a/some');
  console.log(window.TREE);
  window.TREE.push('||| END |||');
  return {
    b: more,
    win: proxy
  };
});