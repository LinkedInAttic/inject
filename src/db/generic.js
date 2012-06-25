(function() {
  // a generic DB to inherit from
  var GenericDB = Class.extend(function() {
    var database = {};

    return {
      init: function() {},
      create: function(id, record) {
        if (!record) {
          record = new GenericDBRecord();
        }
        if (!database[id]) {
          database[id] = record;
        }
        return database[id];
      },
      reset: function() {
        database = {};
      },
      byId: function(id) {
        return database[id];
      }
    };
  });

  // a generic record
  var GenericDBRecord = Class.extend(function() {
    var row = {};
    return {
      init: function() {},
      define: function(setRow) {
        row = setRow;
      },
      get: function(name) {
        var fn = "get_"+name;
        if (this[fn] && typeof(this[fn] === "function")) {
          return this[fn](row[name]);
        }
        return row[name];
      },
      set: function(name, value) {
        var fn = "set_"+name;
        if (this[fn] && typeof(this[fn] === "function")) {
          return this[fn](name, value, row);
        }
        row[name] = value;
        return value;
      }
    };
  });

  DataBase.register("generic", GenericDB);

})();