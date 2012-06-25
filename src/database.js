// singleton DB class entry point
var DataBase;
(function() {
  DataBase = function() {
    return DBInstance;
  };
  var DBInstance = new (Class.extend(function() {
    var logger = new Logger();
    var databases = {};
    var repository = {};

    return {
      init: function() {},
      reset: function() {
        repository = {};
      },
      create: function(name, type) {
        if (!databases[type]) {
          throw new Error("database of type "+type+" does not exist");
        }
        if (!repository[name]) {
          repository[name] = new this[type]();
        }
        return repository[name];
      }
      register: function(type, db) {
        if (databases[type]) {
          databases[type] = db;
        }
        return databases[name];
      },
      get: function(name) {
        if (!repository[name]) {
          logger.log(logger.SEVERE, "DB of name "+name+" does not exist");
        }
      }
    };
  }))();
})();
