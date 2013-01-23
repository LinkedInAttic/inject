/*jshint unused:false */
/*global context:true */
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

(function () {
/*
lscache configuration
requires: localstorage, lscache
Test the schema version inside of lscache, and if it has changed, flush the cache
*/
  var schemaVersion;
  if (HAS_LOCAL_STORAGE && lscache) {
    lscache.setBucket(FILE_STORAGE_TOKEN);
    schemaVersion = lscache.get(LSCACHE_SCHEMA_VERSION_STRING);

    if (schemaVersion && schemaVersion > 0 && schemaVersion < LSCACHE_SCHEMA_VERSION) {
      lscache.flush();
      lscache.set(LSCACHE_SCHEMA_VERSION_STRING, LSCACHE_SCHEMA_VERSION);
    }
  }

  /*
  easyxdm configuration
  requires: easyxdm
  Test for if easyXDM was loaded internally, and if so, ensure it doesn't conflict
  */
  if (LOCAL_EASY_XDM && context.easyXDM) {
    easyXDM = context.easyXDM.noConflict('Inject');
  }
  else {
    easyXDM = false;
  }
})();

/**
    Fiber.js instance
    @type {object}
    @global
 */
var Fiber = this.Fiber.noConflict();