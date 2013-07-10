/**
 * Object that stores states for relay.html,
 * which manages cross-domain dependencies
 */
var ALLOWED_DOMAIN = null,

relayConfig = {        
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

