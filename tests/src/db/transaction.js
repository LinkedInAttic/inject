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
module("TransactionDB and TransactionDBRecord", {
  setup: function() {
    sandbox = new Sandbox(true);
    loadDependencies(sandbox, [
      "/src/lib/class.js",
      "/src/database.js",
      "/src/db/generic.js",
      "/src/db/transaction.js"
    ]);
  },
  teardown: function() {
    sandbox = null;
  }
});

test("Scaffolding", function() {
  var context = sandbox.global;
  ok(typeof(context.DataBase.create("testDB", "transaction")) === "object", "object exists");
});

test("Transaction operations", function() {
  var context = sandbox.global;
  var db = context.DataBase.create("txndb", "transaction");
  var txn = db.create("txn01");

  txn.add();
  txn.add();
  txn.add();
  txn.add();
  equal(txn.get("count"), 4, "4 adds yields a total of four");

  txn.subtract();
  equal(txn.get("count"), 3, "4 adds and 1 subtract yields a total of 3");

  txn.subtract();
  txn.subtract();
  txn.subtract();
  ok(txn.isZero(), "after 4 total subtracts, returns to zero");
});