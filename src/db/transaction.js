(function() {
  // transaction DB
  var TransactionDB = GenericDB.extend(function(GenericDB) {
    var superclass = GenericDB.createSuper(this);
    var uniqueCounter = 0;

    return {
      init: function(name) {
        return superclass.init(name);
      },
      create: function() {
        var record = new TransactionDBRecord();
        var id = uniqueCounter++;
        record.define({
          "id": id,
          "count": 0
        });
        superclass.create(id, record);
      }
    };
  });

  var TransactionDBRecord = GenericDBRecord.extend(function(GenericDBRecord) {
    var superclass = GenericDBRecord.createSuper(this);

    return {
      init: function() {
        return superclass.init();
      },
      add: function() {
        return this.set("count", this.get("count")+1);
      },
      subtract: function() {
        return this.set("count", this.get("count")-1);
      }
    };
  });
  
  DataBase.register("transaction", TransactionDB);
});