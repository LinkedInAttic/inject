define('a/some', ['b/more', 'win/proxy'], function(more, proxy) {
  return {
    b: more,
    win: proxy
  };
});