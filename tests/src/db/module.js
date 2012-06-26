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

var sandbox;
module("ModuleDB and ModuleDBRecord", {
  setup: function() {
    sandbox = new Sandbox(true);
    mock_lscache();
    loadDependencies(sandbox, [
      "/src/lib/class.js",
      "/src/database.js",
      "/src/db/generic.js",
      "/src/db/module.js"
    ]);
  },
  teardown: function() {
    sandbox = null;
  }
});

function mock_lscache() {
  var ls = {};
  sandbox.global.lscache = {
    get: function(name) {
      return ls[name] || false;
    },
    set: function(name, value, expires) {
      ls[name] = value;
    }
  };
  sandbox.global.HAS_LOCAL_STORAGE = true;
}

function mock_config(expires) {
  sandbox.global.USER_CONFIG = {};
  sandbox.global.USER_CONFIG.fileExpires = expires;
}

test("Scaffolding", function() {
  var context = sandbox.global;
  ok(typeof(context.DataBase.create("testDB", "module")) === "object", "object exists");
});

test("getting and setting files", function() {
  var context = sandbox.global;
  mock_config(9999);

  var db = context.DataBase.create("testDB", "module");

  // this module has a path, but no file. Its file also
  // is not in cache
  var moduleWithNoFile = db.create("moduleWithNoFile");
  moduleWithNoFile.set("path", "path/returns/nothing");
  equal(moduleWithNoFile.get("file"), false, "no file retrieved for uncached path");

  // this module has a path, but no file. Its file is in
  // lscache
  var moduleWithCacheFile = db.create("moduleWithCacheFile");
  moduleWithCacheFile.set("path", "module/with/cache");
  context.lscache.set("module/with/cache", "module_with_cache");
  equal(moduleWithCacheFile.get("file"), "module_with_cache", "able to get file from lscache mock");

  // this module has a local path and file in registry
  var moduleWithFileLocal = db.create("moduleWithFile");
  moduleWithFileLocal.define({
    path: "local/path",
    file: "local_file"
  });
  equal(moduleWithFileLocal.get("file"), "local_file", "file gotten from internal registry");

  // this module has its path and file set, and then retrieved
  var moduleSettingFile = db.create("moduleSettingFile");
  moduleSettingFile.set("path", "setting/file/api");
  moduleSettingFile.set("file", "setting_file_api");
  equal(moduleSettingFile.get("file"), "setting_file_api", "set through API correct");
  equal(context.lscache.get("setting/file/api"), "setting_file_api", "stored in lscache mock correctly");
});

test("getting and setting files with no caching", function() {
  var context = sandbox.global;
  mock_config(0);

  var db = context.DataBase.create("testDB", "module");

  // this module has a cache file, but shouldn't be used
  var moduleWithCacheFile = db.create("moduleWithCacheFile");
  moduleWithCacheFile.set("path", "module/with/cache");
  context.lscache.set("module/with/cache", "module_with_cache");
  equal(moduleWithCacheFile.get("file"), false, "expires = 0 means cache is skipped");
});