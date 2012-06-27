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
module("QueueDB and QueueDBRecord", {
  setup: function() {
    sandbox = new Sandbox(true);
    loadDependencies(sandbox, [
      "/src/lib/class.js",
      "/src/database.js",
      "/src/db/generic.js",
      "/src/db/queue.js"
    ]);
  },
  teardown: function() {
    sandbox = null;
  }
});

test("Scaffolding", function() {
  var context = sandbox.global;
  ok(typeof(context.DataBase.create("testDB", "queue")) === "object", "object exists");
});

test("Queue operations", function() {
  var context = sandbox.global;
  var db = context.DataBase.create("QueueDB", "queue");
  var queue = db.create("queueName");

  equal(queue.isDirty(), false, "queue is not dirty");

  queue.add("a");
  queue.add("b");
  equal(queue.isDirty(), true, "queue is dirty / modified");
  equal(queue.get("queue")[0], "a", "queue elements valid");
  equal(queue.get("queue")[1], "b", "new elements at end");

  queue.remove();
  equal(queue.get("queue")[0], "b", "first element removed");
  equal(typeof(queue.get("queue")[1]), "undefined", "second element was shifted forward");

  queue.add("c");
  queue.add("d");
  queue.add("a");
  queue.sort();
  equal(queue.isDirty(), false, "sorting removes dirty flag");
  equal(queue.get("queue")[0], "a", "queue sorted successfully");
  equal(queue.size(), 4, "queue is proper size");
  equal(queue.peek(), "a", "first element peeks to index 0");

  queue.empty();
  equal(typeof(queue.get("queue")[0]), "undefined", "queue emptied successfully");

});