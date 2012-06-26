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
module("GenericDB and GenericDBRecord", {
  setup: function() {
    sandbox = new Sandbox(true);
    loadDependencies(sandbox, [
      "/src/lib/class.js",
      "/src/database.js",
      "/src/db/generic.js"
    ]);
  },
  teardown: function() {
    sandbox = null;
  }
});

test("Scaffolding", function() {
  var context = sandbox.global;
  ok(typeof(context.DataBase.create("testDB", "generic")) === "object", "object exists");
});

test("Create/Get", function() {
  var db = sandbox.global.DataBase.create("testDB", "generic");
  var id = "testId12345";
  var record = db.create(id);
  var recordGet = db.byId(id);

  ok(record instanceof sandbox.global.GenericDBRecord, "returned object is GenericDBRecord");
  equal(record, recordGet, "create and get return same object");
});

test("reset", function() {
  var db = sandbox.global.DataBase.create("testDB", "generic");
  var id = "resetId12345";
  var record = db.create(id);
  var recordGet;

  db.reset();
  recordGet = db.byId(id);

  equal(recordGet, null, "reset DB has null entries");
});

test("manipulate a record", function() {
  var db = sandbox.global.DataBase.create("testDB", "generic");
  var id = "manipId12345";
  var record = db.create(id);
  var recordGet;
  
  record.define({
    "one": 1,
    "two": 2,
    "three": 3
  });

  delete record;

  recordGet = db.byId(id);
  recordGet.set("two", 7);
  equal(recordGet.get("two"), 7, "get returns new record value");
  equal(recordGet.get("three"), 3, "get returns existing record value");

});