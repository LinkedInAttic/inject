define('concat_a', ["exports"], function(exports) {
  var concat_a = function() {
    var module = "concat_a";
  
    return {
      getModuleName: function() {
        return module;
      }
    }
  }
  exports.concat_a = concat_a;
});

define('concat_b', ["exports"], function(exports) {
  var concat_b = function() {
    var module = "concat_a";
  
    return {
      getModuleName: function() {
        return module;
      }
    }
  }
  exports.concat_b = concat_b;
});

define('concat_c', ["exports"], function(exports) {
  var concat_c = function() {
    var module = "concat_c";
  
    return {
      getModuleName: function() {
        return module;
      }
    }
  }
  exports.concat_c = concat_c;
});