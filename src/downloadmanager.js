// download manager JS
var DownloadManager;
(function() {
  var AsStatic = Class.extend(function() {
    return {
      init: function() {},
      download: function(moduleId, callback) {}
    };
  });
  DownloadManager = new AsStatic();
})();