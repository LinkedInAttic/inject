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

// our module DB
var ModuleDB = GenericDB.extend(function(GenericDB) {
  var superclass = GenericDB.createSuper(this);
  var anonCounter = 0;

  return {
    init: function() {
      return superclass.init();
    },
    create: function(id) {
      if (!id) {
        id = "anonymous"+(anonCounter++);
      }
      var record = new ModuleDBRecord();
      record.define({
        "failed": false,
        "exports": null,
        "path": null,
        "file": null,
        "amd": false,
        "loading": false,
        "executed": false,
        "rulesApplied": false,
        "requires": [],
        "exec": null,
        "pointcuts": {
          "before": [],
          "after": []
        }
      });
      return superclass.create(id, record);
    }
  };
});

var ModuleDBRecord = GenericDBRecord.extend(function(GenericDBRecord) {
  var superclass = GenericDBRecord.createSuper(this);
  var cache = lscache;

  return {
    init: function() {
      return superclass.init();
    },
    get_exports: function(exports) {
      if (this.get("failed")) {
        return false;
      }
      if (exports) {
        return exports;
      }
      if (this.get("exec") && typeof(this.get("exec")) === "function") {
        exports = this.get("exec")();
        this.set("exports", exports);
        return exports;
      }
      return false;
    },
    get_file: function(file) {
      if (file) {
        return file;
      }

      // check if we have always fetch on
      if (USER_CONFIG.fileExpires === 0) {
        return false;
      }

      // check localstorage
      if (HAS_LOCAL_STORAGE && this.get("path")) {
        file = cache.get(this.get("path"));
        if (file && typeof(file) === "string" && file.length > 0) {
          this.set("file", file);
          return file;
        }
      }

      return false;
    },
    set_file: function(value, row) {
      var path = this.get("path");
      row.file = value;

      // pass through localstorage
      if (HAS_LOCAL_STORAGE && path) {
        cache.set(path, value, USER_CONFIG.fileExpires);
      }
      return row.file;
    }
  };
});

DataBase.register("module", ModuleDB);