// document.head reference
var docHead = null;

// offset for onerror calls
var onErrorOffset = 0;

// functions initialized to date
var funcCount = 0;

// user configuration options (see reset)
var userConfig = {};

// undefined
var undef = undefined;

// context is our local scope. Should be "window"
var context = this;

// can we run immediately? when using iframe transport, the answer is no
var pauseRequired = false;

// a cross domain RPC object (easyXdm)
var socket = null;

// any mappings for module => handling defined by the user
var userModules = {};

// a placeholder for the easyXDM lib if loaded
var easyXdm = false;