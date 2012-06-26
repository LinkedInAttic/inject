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
