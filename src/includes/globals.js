// document.head reference
var docHead = null;

// offset for onerror calls
var onErrorOffset = 0;

// functions initialized to date
var funcCount = 0;

// user configuration options (see reset)
var userConfig = {};

// context is our local scope. Should be "window"
var context = this;

// any mappings for module => handling defined by the user
var userModules = {};

// a placeholder for the easyXDM lib if loaded
var easyXdm = false;