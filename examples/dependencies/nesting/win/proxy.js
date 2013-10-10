define('win/proxy', ['win/global'], function() {
  window.TREE.push('win/proxy');
  console.log(window.TREE);
  return {
    ans: window.WINGLOBAL
  };
});