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

var DataBase;
(function() {
  var AsStatic = Class.extend(function() {
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
          repository[name] = new databases[type]();
        }
        return repository[name];
      },
      register: function(type, db) {
        if (!databases[type]) {
          databases[type] = db;
        }
        return databases[type];
      },
      get: function(name) {
        if (!repository[name]) {
          throw new Error("Database "+name+" does not exist yet. Perhaps you meant to create it?");
        }
        return repository[name];
      }
    };
  });
  DataBase = new AsStatic();
})();
