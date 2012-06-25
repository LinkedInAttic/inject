/*
lscache configuration
requires: localstorage, lscache
Test the schema version inside of lscache, and if it has changed, flush the cache
*/
if (hasLocalStorage && lscache) {
  lscache.setBucket(fileStorageToken);
  lscacheSchemaVersion = lscache.get(schemaVersionString);

  if (lscacheSchemaVersion && lscacheSchemaVersion > 0 && lscacheSchemaVersion < schemaVersion) {
    lscache.flush();
    lscacheSchemaVersion = 0;
    if (!lscacheSchemaVersion) {
      lscache.set(schemaVersionString, schemaVersion);
    }
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