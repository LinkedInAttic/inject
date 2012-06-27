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

// Queue DB
var QueueDB = GenericDB.extend(function(GenericDB) {
  var superclass = GenericDB.createSuper(this);

  return {
    init: function(name) {
      return superclass.init(this, name);
    },
    create: function(id) {
      var record = new QueueDBRecord();
      record.define({
        "queue": []
      });
      return superclass.create(id, record);
    }
  };
});

var QueueDBRecord = GenericDBRecord.extend(function(GenericDBRecord) {
  var superclass = GenericDBRecord.createSuper(this);
  var isDirty = false;

  return {
    init: function() {
      return superclass.init();
    },
    add: function(item) {
      this.get("queue").push(item);
      isDirty = true;
    },
    remove: function() {
      return this.get("queue").shift();
    },
    sort: function(fn) {
      this.get("queue").sort(fn);
      isDirty = false;
    },
    size: function() {
      return this.get("queue").length;
    },
    empty: function() {
      this.set("queue", []);
      isDirty = false;
    },
    peek: function() {
      return this.get("queue")[0];
    },
    isDirty: function() {
      return isDirty;
    },
    each: function(fn) {
      var queue = this.get("queue");
      var result = [];
      for (var i = 0, len = queue.length; i < len; i++) {
        result.push(fn(queue[i]));
      }
      return result;
    }
  };
});

DataBase.register("queue", QueueDB);
