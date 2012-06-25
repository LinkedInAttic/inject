(function() {
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
  easyXDM = context.easyXDM.noConflict("Inject");
}
else {
  easyXDM = false;
}

})();