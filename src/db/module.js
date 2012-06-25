(function() {
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
        superclass.create(this, id, record);
      }
    };
  });

  var ModuleDBRecord = GenericDBRecord.extend(function(GenericDBRecord) {
    var superclass = GenericDBRecord.createSuper(this);
    var lscache = LIBRARIES.lscache;

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
          file = lscache.get(this.get("path"));
          if (file && typeof(file) === "string" && file.length > 0) {
            this.set("file", file);
            return file;
          }
        }

        return false;
      },
      set_file: function(name, value, row) {
        var path = this.get("path");
        row[name] = value;

        // pass through localstorage
        if (HAS_LOCAL_STORAGE) {
          lscache.set(path, value, USER_CONFIG.fileExpires);
        }
        return value;
      }
    };
  });
  
  DataBase.register("module", ModuleDB);
})();