###
Inject: Dependency Awesomeness

Some sample ways to use inject...
inject("moduleOne", "moduleTwo", "moduleThree", function(a, b, c) {
  // n args, last is function. Inject those modules, then run this body
  // modules are available as arguments
});

Configuring inject()
inject().config({
  // where are your JS files? Can also be a function which will do
  // lookups for you
  path: "http://example.com/path/to/js/root",
  
  // if your JS files are on a different domain, you'll need to use
  // relay files. See the readme
  xd: {
    inject: "http://local.example.com/path/to/relay.html",
    xhr: "http://remote.example.com/path/to/relay.html"
  }
})

Specifying specific module locations (that pathing could never guess)
inject().modules({
  // module name, module path
  moduleName: "http://example.com/location/of/module.js"
})
###

###
Porthole
###
`
var Porthole=(typeof Porthole=="undefined")||!Porthole?{}:Porthole;Porthole={trace:function(a){try{console.log("Porthole: "+a)}catch(b){}},error:function(a){try{console.error("Porthole: "+a)}catch(b){}}};Porthole.WindowProxy=function(){};Porthole.WindowProxy.prototype={postMessage:function(){},addEventListener:function(a){},removeEventListener:function(a){}};Porthole.WindowProxyLegacy=function(a,b){if(b===undefined){b=""}this.targetWindowName=b;this.eventListeners=[];this.origin=window.location.protocol+"//"+window.location.host;if(a!==null){this.proxyIFrameName=this.targetWindowName+"ProxyIFrame";this.proxyIFrameLocation=a;this.proxyIFrameElement=this.createIFrameProxy()}else{this.proxyIFrameElement=null}};Porthole.WindowProxyLegacy.prototype={getTargetWindowName:function(){return this.targetWindowName},getOrigin:function(){return this.origin},createIFrameProxy:function(){var a=document.createElement("iframe");a.setAttribute("id",this.proxyIFrameName);a.setAttribute("name",this.proxyIFrameName);a.setAttribute("src",this.proxyIFrameLocation);a.setAttribute("frameBorder","1");a.setAttribute("scrolling","auto");a.setAttribute("width",30);a.setAttribute("height",30);a.setAttribute("style","position: absolute; left: -100px; top:0px;");if(a.style.setAttribute){a.style.setAttribute("cssText","position: absolute; left: -100px; top:0px;")}document.body.appendChild(a);return a},postMessage:function(b,a){if(a===undefined){a="*"}if(this.proxyIFrameElement===null){Porthole.error("Can't send message because no proxy url was passed in the constructor")}else{sourceWindowName=window.name;this.proxyIFrameElement.setAttribute("src",this.proxyIFrameLocation+"#"+b+"&sourceOrigin="+escape(this.getOrigin())+"&targetOrigin="+escape(a)+"&sourceWindowName="+sourceWindowName+"&targetWindowName="+this.targetWindowName);this.proxyIFrameElement.height=this.proxyIFrameElement.height>50?50:100}},addEventListener:function(a){this.eventListeners.push(a);return a},removeEventListener:function(b){try{var a=this.eventListeners.indexOf(b);this.eventListeners.splice(a,1)}catch(c){this.eventListeners=[];Porthole.error(c)}},dispatchEvent:function(c){for(var b=0;b<this.eventListeners.length;b++){try{this.eventListeners[b](c)}catch(a){Porthole.error("Exception trying to call back listener: "+a)}}}};Porthole.WindowProxyHTML5=function(a,b){if(b===undefined){b=""}this.targetWindowName=b};Porthole.WindowProxyHTML5.prototype={postMessage:function(b,a){if(a===undefined){a="*"}if(this.targetWindowName===""){targetWindow=top}else{targetWindow=parent.frames[this.targetWindowName]}targetWindow.postMessage(b,a)},addEventListener:function(a){window.addEventListener("message",a,false);return a},removeEventListener:function(a){window.removeEventListener("message",a,false)},dispatchEvent:function(b){var a=document.createEvent("MessageEvent");a.initMessageEvent("message",true,true,b.data,b.origin,1,window,null);window.dispatchEvent(a)}};if(typeof window.postMessage!="function"){Porthole.trace("Using legacy browser support");Porthole.WindowProxy=Porthole.WindowProxyLegacy;Porthole.WindowProxy.prototype=Porthole.WindowProxyLegacy.prototype}else{Porthole.trace("Using built-in browser support");Porthole.WindowProxy=Porthole.WindowProxyHTML5;Porthole.WindowProxy.prototype=Porthole.WindowProxyHTML5.prototype}Porthole.WindowProxy.splitMessageParameters=function(c){if(typeof c=="undefined"||c===null){return null}var e=[];var d=c.split(/&/);for(var b in d){var a=d[b].split("=");if(typeof(a[1])=="undefined"){e[a[0]]=""}else{e[a[0]]=a[1]}}return e};Porthole.MessageEvent=function MessageEvent(c,a,b){this.data=c;this.origin=a;this.source=b};Porthole.WindowProxyDispatcher={forwardMessageEvent:function(c){var b=document.location.hash;if(b.length>0){b=b.substr(1);m=Porthole.WindowProxyDispatcher.parseMessage(b);if(m.targetWindowName===""){targetWindow=top}else{targetWindow=parent.frames[m.targetWindowName]}var a=Porthole.WindowProxyDispatcher.findWindowProxyObjectInWindow(targetWindow,m.sourceWindowName);if(a){if(a.origin==m.targetOrigin||m.targetOrigin=="*"){c=new Porthole.MessageEvent(m.data,m.sourceOrigin,a);a.dispatchEvent(c)}else{Porthole.error("Target origin "+a.origin+" does not match desired target of "+m.targetOrigin)}}else{Porthole.error("Could not find window proxy object on the target window")}}},parseMessage:function(b){if(typeof b=="undefined"||b===null){return null}params=Porthole.WindowProxy.splitMessageParameters(b);var a={targetOrigin:"",sourceOrigin:"",sourceWindowName:"",data:""};a.targetOrigin=unescape(params.targetOrigin);a.sourceOrigin=unescape(params.sourceOrigin);a.sourceWindowName=unescape(params.sourceWindowName);a.targetWindowName=unescape(params.targetWindowName);var c=b.split(/&/);if(c.length>3){c.pop();c.pop();c.pop();c.pop();a.data=c.join("&")}return a},findWindowProxyObjectInWindow:function(a,c){if(a.RuntimeObject){a=a.RuntimeObject()}if(a){for(var b in a){try{if(a[b]!==null&&typeof a[b]=="object"&&a[b] instanceof a.Porthole.WindowProxy&&a[b].getTargetWindowName()==c){return a[b]}}catch(d){}}}return null},start:function(){if(window.addEventListener){window.addEventListener("resize",Porthole.WindowProxyDispatcher.forwardMessageEvent,false)}else{if(document.body.attachEvent){window.attachEvent("onresize",Porthole.WindowProxyDispatcher.forwardMessageEvent)}else{Porthole.error("Can't attach resize event")}}}};
`
###
End Porthole
###

context = this
oldInject = context.inject
pauseRequired = false
loadQueue = []

# Set the config
config = {}
setConfig = (cfg) ->
  config = cfg

# set user defined modules
userModules = {}
setUserModules = (modl) ->
  userModules = modl

# set the namespace
namespace = ""
setNamespace = (ns) ->
  namespace = ns

# get and save a module by name
moduleRegistry = {}
getModule = (module) ->
  return moduleRegistry[module] or false
saveModule = (module, exports) ->
  if moduleRegistry[module] then return
  moduleRegistry[module] = exports

# get and save a file by path
fileRegistry = {}
getFile = (path) ->
  return fileRegistry[path] or false
saveFile = (path, file) ->
  if fileRegistry[path] then return
  fileRegistry[path] = file

# create a transaction id
counter = 0
createTxId = () ->
  return "txn_#{counter++}"

# create an iframe to the config.xd.remote location
xDomainRpc = null
createIframe = () ->
  responseSlicer = /^(.+?) (.+?) (.+?) (.+)$/m
  hostPrefixRegex = /^https?:\/\//
  hostSuffixRegex = /^(.*?)(\/.*|$)/
  src = config?.xd?.xhr
  localSrc = config?.xd?.inject
  iframeName = "injectProxy"
  if !src then throw new Error("Configuration requires xd.remote to be defined")
  if !localSrc then throw new Error("Configuration requires xd.local to be defined")
  
  trimHost = (host) ->
    host = host.replace(hostPrefixRegex, "").replace(hostSuffixRegex, "$1")
    return host
  
  try
    iframe = document.createElement("<iframe name=\"" + iframeName + "\"/>")
  catch err
    iframe = document.createElement("iframe")
  iframe.name = iframeName
  iframe.src = src+"#xhr"
  iframe.style.width = iframe.style.height = "1px"
  iframe.style.right = iframe.style.bottom = "0px"
  iframe.style.position = "absolute"
  iframe.id = iframeName
  document.body.insertBefore(iframe, document.body.firstChild)
  
  # Create a proxy window to send to and receive message from the guest iframe
  xDomainRpc = new Porthole.WindowProxy(config.xd.xhr+"#xhr", iframeName);
  xDomainRpc.addEventListener (event) ->
    if trimHost(event.origin) isnt trimHost(config.xd.xhr) then return
    
    # Ready init
    if event.data is "READY"
      xDomainRpc.postMessage("READYREADY")
      pauseRequired = false
      item() for item in loadQueue
      return
    
    pieces = event.data.match(responseSlicer)
    onModuleLoad(pieces[1], pieces[2], pieces[3], pieces[4])

# an interface for configuring inject
configInterface =
  config: (cfg) ->
    # clean up cfg
    if !cfg.path then throw new Error("Config requires at least path to be set")
    if typeof(cfg.path) is "string" and cfg.path.lastIndexOf("/") isnt cfg.path.length then cfg.path = "#{cfg.path}/"
    setConfig(cfg)
    return configInterface
  modules: (modl) ->
    setModules(modl)
    return configInterface
  noConflict: (ns) ->
    setNamespace(ns)
    currentInject = context.inject
    context.inject = oldInject
    context[ns] = currentInject
    return true

# normalizes modules into names
# cache is only for this function
modulePathRegistry = {}
jsSuffix = /.*?\.js$/
normalizePath = (path) ->
  lookup = path
  configPath = config.path or ""
  
  # short circuit: already cached
  if modulePathRegistry[path] then return modulePathRegistry[path]
  
  # short circuit: defined in a file
  if userModules[path]
    path = userModules[path]
    modulePathRegistry[lookup] = path
    return path
  
  # short circuit: function for path resolution
  if typeof(configPath) is "function"
    path = configPath(path)
    modulePathRegistry[lookup] = path
    return path

  # short circuit: fully qualified path
  if path.indexOf("http") is 0 or path.indexOf("https") is 0
    modulePathRegistry[lookup] = path
    return path
  
  if path.indexOf("/") isnt 0 and typeof(configPath) is "undefined" then throw new Error("Path must be defined")  
  if path.indexOf("/") isnt 0 and typeof(configPath) is "string" then path = "#{config.path}#{path}"
  if !jsSuffix.test(path) then path = "#{path}.js"

  modulePathRegistry[lookup] = path
  
  return path

# loads modules
callbackRegistry = {}
txnRegistry = {}
loadModules = (modList, cb) ->
  # for each item in the mod list
  # resolve it to a full url for file access
  # if it has been loaded, flag done & go on
  # else, queue the module.
  txId = createTxId()
  paths = {}
  (paths[module] = normalizePath(module)) for module in modList
  txnRegistry[txId] = modList
  callbackRegistry[txId] = cb
  
  # paths now has everything we need to include
  # if xd params are set, add them to the queue for iframe dispatch
  for module, path of paths
    # do we have it locally?
    if getModule(module) then paths[module] = getModule(module)
    # do we have the file locally?
    else if getFile(path) then onModuleLoad(txId, module, path, getFile(path))
    # we don't have the file or module, we must retrieve it
    # if iframe
    else
      if config.xd?
        sendToIframe(txId, module, path, onModuleLoad)
      else
        sendToXhr(txId, module, path, onModuleLoad)

# handles when payload is received either from the iframe or XHR
commonJSHeader = '''
(function() {
  var exports = {};
  (function() {
'''
commonJSFooter = '''
  })();
  return exports;
})();
'''
onModuleLoad = (txId, module, file, text) ->
  # create the commonJS wrapper for this file and execute it
  # suck up the exports, write to the module collection
  # write the collection to the path as well
  # invoke check for completeness
  runCmd = "#{commonJSHeader}\n#{text}\n#{commonJSFooter}"
  try
    exports = eval(runCmd)
  catch err
    throw err
  saveModule(module, exports)
  saveFile(file, text)
  checkComplete(txId)

checkComplete = (txId) ->
  done = true
  cb = callbackRegistry[txId]
  modules = []
  for module in txnRegistry[txId]
    modl = getModule(module)
    if modl is false then done = false else modules.push(modl)
    if !done then break
  if done then cb.call(context, modules)

# request a file via XHR        
sendToXhr = (txId, module, path, cb) ->
  xhr = getXHR()
  xhr.open("GET", path)
  xhr.onreadystatechange = () ->
    if xhr.readyState == 4 and xhr.status == 200 then cb.call(context, txId, module, path, xhr.responseText)
  xhr.send(null)

# request a file via iframe
sendToIframe = (txId, module, path, cb) ->
  console.log "posting: #{txId} #{module} #{path}"
  xDomainRpc.postMessage("#{txId} #{module} #{path}")

# get an xmlhttp object
getXHR = () ->
  xmlhttp = false
  if typeof XMLHttpRequest isnt "undefined"
    try
      xmlhttp = new XMLHttpRequest()
    catch errorWin
      xmlhttp = false
  if !xmlhttp and typeof window.createRequest isnt "undefined"
    try
      xmlhttp = new window.createRequest()
    catch errorCr
      xmlhttp = false
  if !xmlhttp
    try
      xmlhttp = new ActiveXObject("Msxml2.XMLHTTP")
    catch msErrOne
      try
        xmlhttp = new ActiveXObject("Microsoft.XMLHTTP")
      catch msErrTwo
        xmlhttp = false
  if !xmlhttp then throw new Error("Could not create an xmlHttpRequest Object")
  return xmlhttp

# Main Method
inject = (args...) ->
  # if no args, return config interface
  if args.length == 0 then return configInterface

  # last arg must be a callback function
  if typeof(args[args.length - 1]) != "function" then throw new Error("Last argument must be a function")
  fn = args.pop()

  # init the iframe if required
  if config.xd? and !xDomainRpc and !pauseRequired
    createIframe()
    pauseRequired = true
  
  # our default behavior. Load everything
  # then, once everything says its loaded, call the callback
  run = () ->
    loadModules args, (modules) ->
      fn.apply(context, modules)
  
  if pauseRequired then loadQueue.push(run)
  else run()
  
context.inject = inject