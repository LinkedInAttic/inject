(function() {
  // Queue DB
  var QueueDB = GenericDB.extend(function(GenericDB) {
    var superclass = GenericDB.createSuper(this);

    return {
      init: function(name) {
        return superclass.init(this, name);
      },
      create: function() {
        var record = new QueueDBRecord();
        record.define({
          "queue": []
        });
        superclass.create(id, record);
      }
    };
  });

  var QueueDBRecord = GenericDBRecord.extend(function(GenericDBRecord) {
    var superclass = GenericDBRecord.createSuper(this);

    return {
      init: function() {
        return superclass.init();
      },
      add: function(item) {
        this.get("queue").unshift(item);
      },
      remove: function() {
        return this.get("queue").shift();
      },
      sort: function(fn) {
        this.get("queue").sort(fn);
      },
      size: function() {
        return this.get("queue").length;
      },
      empty: function() {
        this.set("queue", []);
      },
      peek: function() {
        return this.get("queue")[0];
      }
    };
  });
  
  DataBase.register("queue", QueueDB);
  
});