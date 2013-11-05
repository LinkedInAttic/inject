// For added security, set this to the only domain allowed to communicate with
// this relay.html file
var ALLOWED_DOMAIN = null;

// If relay.swf is in a non-programtic location, but is NOT in the same directory as
// this relay.html file, you may specify its alternate location here
var ALTERNATE_SWF_LOCATION = null;

// ====== DO NOT CHANGE BELOW THIS LINE ======
var relayConfig = {
  moduleRoot: null,  //Root location of the module
  fileExpires: 300,  //request will expire 300 seconds
  useSuffix: true,
  xd: {              //xd directory in src contains relay and relay.swf files,which have to
    relayFile: null, //be put on the domain being used for the cross-domain dependencies
    relaySwf: null
  },
  debug: {
    sourceMap: false,
    logging: false
  }
};

