/*
Inject
Copyright 2011 LinkedIn

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing,
software distributed under the License is distributed on an "AS
IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
express or implied.   See the License for the specific language
governing permissions and limitations under the License.
*/

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