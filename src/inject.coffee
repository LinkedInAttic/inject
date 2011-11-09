###
# Inject: Dependency Awesomeness #

Some sample ways to use inject...
    var foo = require("moduleName");
    require.ensure(["moduleOne", "moduleTwo", "moduleThree"], function(require, exports, module) {
      var foo = require("moduleOne");
    })

Configuring Inject
  require.setModuleRoot("http://example.com/path/to/js/root")
  require.setCrossDomain("http://local.example.com/path/to/relay.html", "http://remote.example.com/path/to/relay.html")
  require.manifest({
    moduleName: "http://local.example.com/path/to/module"
  }, [weight])
  require.manifest(function(path) {
  
  }, [weight])
  require.run("appName")

For more details, check out the README or github: https://github.com/Jakobo/inject
###

#
# Conventions and syntax for inject() for contributions
# 
# CoffeeScript @ 2 spaces indent
# 
# Parentheses () required at all times except:
# * Statement is single line, single argument: someValue.push pushableItem
# * Statement is single line, last argument is a callback: someAsyncFunction argOne, argTwo, (cbOne, cbTwo) ->
# 
# Over Comment
#
# Always run "cake build" and make sure it compiles. Testing is also a bonus
#

###
Constants and Registries used
###
schemaVersion = 1                   # version of inject()'s localstorage schema
context = this                      # context is our local scope. Should be "window"
pauseRequired = false               # can we run immediately? when using iframe transport, the answer is no
fileRegistry = null                 # a registry of file text that has been loaded
fileStorage = null                  # localstorage for files (PersistJS)
xDomainRpc = null                   # a cross domain RPC object (Porthole)
fileStorageToken = "FILEDB"         # a storagetoken identifier we use (PersistJS)
fileStore = "Inject FileStorage"    # file store to use
namespace = "Inject"                # the namespace for inject() that is publicly reachable
fileExpiration = 86400              # the default time (in seconds) to cache a file for (one day)
counter = 0                         # a counter used for transaction IDs
loadQueue = []                      # when making iframe calls, there's a queue that can stack up while waiting on everything to load
userModules = {}                    # any mappings for module => handling defined by the user
moduleRegistry = {}                 # a registry of modules that have been loaded
modulePathRegistry = {}             # a collection of modules organized by their path information
callbackRegistry = {}               # a registry of callbacks keyed by Transaction IDs
txnRegistry = {}                    # a list of modules that were required for a transaction, keyed by Transaction IDs
fileOnComplete = {}                 # a list of subscribing transactions for a file's onModuleLoad resolution, keyed by Path
config =                            # This is the default config when no changes are made
  fileExpiration: fileExpiration    # default file expiry
jsSuffix = /.*?\.js$/               # Regex for identifying things that end in *.js
hostPrefixRegex = /^https?:\/\//    # prefixes for URLs that begin with http/https
hostSuffixRegex = /^(.*?)(\/.*|$)/  # suffix for URLs used to capture everything up to / or the end of the string
iframeName = "injectProxy"          # the name for the iframe proxy created (Porthole)
requireRegex = ///                  # a regex for capturing the require() statements inside of included code
  require[\s]*\([\s]*                 # followed by require, a whitespace character 0+, and an opening ( then more whitespace
  (?:"|')                             # followed by a quote
  ([\w\/\.\:]+?)                      # (1) capture word characters, forward slashes, dots, and colons (at least one)
  (?:'|")                             # followed by a quote
  [\s]*\)                             # followed by whitespace, and then a closing ) that ends the require() call
  ///gm
responseSlicer = ///                # a regular expression for slicing a response from iframe communication into its parts
  ^(.+?)[\s]                          # (1) Begins with anything up to a space
  (.+?)[\s]                           # (2) Continues with anything up to a space
  (.+?)[\s]                           # (3) Continues with anything up to a space
  ([\w\W]+)$                          # (4) Any text up until the end of the string
  ///m                                # Supports multiline expressions

###
CommonJS wrappers for a header and footer
these bookend the included code and insulate the scope so that it doesn't impact inject()
or anything else.
this helps secure module bleeding
###
commonJSHeader = '''
with (window) {
  (function() {
    var module = {}, exports = {}, require = __INJECT_NS__.require, exe = null;
    module.id = "__MODULE_ID__";
    module.uri = "__MODULE_URI__";
    module.exports = exports;
    exe = function(module, exports, require) {
      __POINTCUT_BEFORE__
'''
commonJSFooter = '''
      __POINTCUT_AFTER__
    };
    exe.call(module, module, exports, require);
    return module.exports;
  })();
}
'''
setConfig = (cfg) ->
  ###
  ## setConfig(cfg) ##
  _internal_ Set the config
  ###
  config = cfg
  # defaults
  if !config.fileExpiration? then config.fileExpiration = fileExpiration

setUserModules = (modl) ->
  ###
  ## setUserModules(modl) ##
  _internal_ Set the collection of user defined modules
  ###
  userModules = modl

getModule = (module) ->
  ###
  ## getModule(module) ##
  _internal_ Get a module by name
  ###
  return moduleRegistry[module] or false

saveModule = (module, exports) ->
  ###
  ## saveModule(module, exports) ##
  _internal_ Save a module by name
  ###
  if moduleRegistry[module] then return
  moduleRegistry[module] = exports  
  
isExpired = (path) ->
  ###
  ## isExpired(mpath) ##
  _internal_ test if a cached file is expired, if it is, remove it from the cache
  ###
  if fileRegistry[path]?.expires > (new Date()).getTime() then return false
  if fileRegistry[path]? then fileRegistry[path] = {}
  return true

isCached = (path) ->
  ###
  ## isCached(mpath) ##
  _internal_ test if a file is in the cache and valid (not expired)
  ###
  return fileRegistry? and fileRegistry[path]? and fileRegistry[path].content and !isExpired(path)

getFile = (path, cb) ->
  ###
  ## getFile(path, cb) ##
  _internal_ Get a file by its path. Asynchronously calls its callback.
  Uses LocalStorage or UserData if available
  ###
  token = "#{fileStorageToken}#{schemaVersion}"
  
  if !fileStorage then fileStorage = new Persist.Store(fileStore)
  
  if !fileRegistry
    # With no file registry, attempt to load from local storage
    # if the token exists, parse it. If the path is cached, then use the cached item
    # otherwise, mark the item as false
    # if there is nothing in cache, create the fileRegistry object
    fileStorage.get token, (ok, val) ->
      if ok and typeof(val) is "string" and val.length
        fileRegistry = JSON.parse(val)
        if isCached(path) then return cb(true, fileRegistry[path].content)
        else return cb(false, null)
      else
        fileRegistry = {}
        return cb(false, null)
  else
    # the file registry object exists, so we have loaded the content
    # if the path is cached, use the cached value, otherwise false
    if isCached(path) then return cb(true, fileRegistry[path].content)
    else return cb(false, null)

    
saveFile = (path, file) ->
  ###
  ## saveFile(path, file) ##
  _internal_ Save a file for resource `path` into LocalStorage or UserData
  Also updates the internal fileRegistry
  ###
  token = "#{fileStorageToken}#{schemaVersion}"
  
  if !fileStorage then fileStorage = new Persist.Store(fileStore)
  if isCached(path) then return
  fileRegistry[path] =
    content: file
    expires: (config.fileExpiration * 1000) + (new Date()).getTime()
  fileStorage.set token, JSON.stringify(fileRegistry)
  
clearFileRegistry = (version = schemaVersion) ->
  ###
  ## clearFileRegistry(version = schemaVersion) ##
  _internal_ Clears the internal file registry at `version`
  ###
  token = "#{fileStorageToken}#{version}"
  
  if !fileStorage then fileStorage = new Persist.Store(fileStore)
  fileStorage.set(token, "")
  if version == schemaVersion then fileRegistry = {}

createTxId = () ->
  ###
  ## createTxId() ##
  _internal_ create a transaction id
  ###
  return "txn_#{counter++}"

createIframe = () ->
  ###
  ## createIframe() ##
  _internal_ create an iframe to the config.xd.remote location
  ###
  src = config?.xd?.xhr
  localSrc = config?.xd?.inject
  if !src then throw new Error("Configuration requires xd.remote to be defined")
  if !localSrc then throw new Error("Configuration requires xd.local to be defined")
  
  # trims the host down to its essential values
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

getPointcuts = (module) ->
  ###
  ## getPointcuts(module) ##
  _internal_ get the [pointcuts](http://en.wikipedia.org/wiki/Pointcut) for a module if
  specified
  ###
  noop = () -> return
  pointcuts =
    before: noop
    after: noop
  if !userModules[module] then return pointcuts
  definition = userModules[module]
  
  for cut, fn of pointcuts
    if definition[cut] then pointcuts[cut] = definition[cut]
  
  return pointcuts

normalizePath = (path) ->
  ###
  ## normalizePath(path) ##
  _internal_ normalize the path based on the module collection or any functions
  associated with its identifier
  ###
  lookup = path
  workingPath = path
  configPath = config.path or ""
  
  # short circuit: already cached
  if modulePathRegistry[path] then return modulePathRegistry[path]
  
  # defined in a user module?
  if userModules[path]
    moduleDefinition = userModules[path]
    
    # if the definition is a string, use that
    if typeof(moduleDefinition) is "string"
      workingPath = moduleDefinition
    
    # if the definition is an object and has a path variable
    if typeof(moduleDefinition) is "object" and moduleDefinition.path
      # if the path variable is a function, run the function
      if typeof(moduleDefinition.path) is "function"
        returnPath = moduleDefinition.path(workingPath)
        if returnPath isnt false then workingPath = returnPath
      # id the module definition is a string, use that
      if typeof(moduleDefinition.path) is "string"
        workingPath = moduleDefinition.path
  
  # function for path resolution
  if typeof(configPath) is "function"
    returnPath = configPath(workingPath)
    if returnPath isnt false then workingPath = returnPath

  # short circuit: fully qualified path
  if workingPath.indexOf("http") is 0 or workingPath.indexOf("https") is 0
    modulePathRegistry[lookup] = workingPath
    return modulePathRegistry[lookup]
  
  if workingPath.indexOf("/") isnt 0 and typeof(configPath) is "undefined" then throw new Error("Path must be defined")  
  if workingPath.indexOf("/") isnt 0 and typeof(configPath) is "string" then workingPath = "#{config.path}#{workingPath}"
  if !jsSuffix.test(workingPath) then workingPath = "#{workingPath}.js"

  modulePathRegistry[lookup] = workingPath
  
  return modulePathRegistry[lookup]

loadModules = (modList, cb) ->
  ###
  ## loadModules(modList, cb) ##
  _internal_ load a collection of modules in modList, and once they have all loaded, execute the callback cb
  ###
  
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
    if !fileOnComplete[path]
      fileOnComplete[path] =
        txns: []
        loading: false
    
    # do we have it locally?
    if getModule(module) then paths[module] = getModule(module)
    # Check localStorage and load
    getFile path, (ok, val) ->
      # listen for evaluation of the module
      fileOnComplete[path].txns.push txId
      
      if ok and typeof(val) is "string" and val.length
        onModuleLoad(txId, module, path, val)
      else
        # we don't have the file or module, we must retrieve it
        # if it's already loading, we just wait
        if (!fileOnComplete[path].loading)
          fileOnComplete[path].loading = true
          if config.xd?
            sendToIframe(txId, module, path, onModuleLoad)
          else
            sendToXhr(txId, module, path, onModuleLoad)

onModuleLoad = (txId, module, path, text) ->
  ###
  ## onModuleLoad(txId, module, path, text) ##
  _internal_ Fired when a module's file has been loaded. Will then set up
  the CommonJS harness, and will capture its exports. After this, it will signal
  to inject() that all items that were waiting on this path should continue checking
  their depdendencies
  ###
  # create the commonJS wrapper for this path and execute it
  # suck up the exports, write to the module collection
  # write the collection to the path as well
  # invoke check for completeness
  
  cuts = getPointcuts(module)
  cutsStr = {}
  (cutsStr[cut] = fn.toString().match(/.*?\{([\w\W]*)\}/m)[1]) for cut, fn of cuts
  
  header = commonJSHeader.replace(/__MODULE_ID__/g, module)
                         .replace(/__MODULE_URI__/g, path)
                         .replace(/__INJECT_NS__/g, namespace)
                         .replace(/__POINTCUT_BEFORE__/g, cutsStr.before)
  footer = commonJSFooter.replace(/__POINTCUT_AFTER__/g, cutsStr.after)
  runCmd = "#{header}\n#{text}\n#{footer}"
  
  # find all require statements
  requires = []
  requires.push(RegExp.$1) while requireRegex.exec(text)
  
  # internal method to onModuleLoad, which will eval the contents and save them
  # will then fire all of the handlers associated w/ the path
  runModule = () ->
    try
      exports = context.eval(runCmd)
    catch err
      throw err
    saveModule(module, exports)
    saveFile(path, text)
    
    # fire all oncompletes that may be waiting
    fileOnComplete[path].loading = false
    for txn in fileOnComplete[path].txns
      checkComplete(txn)
  
  if requires.length > 0
    loadModules requires, () ->
      runModule()
  else
    runModule()


checkComplete = (txId) ->
  ###
  ## checkComplete(txId) ##
  _internal_ check if all modules for a txId have loaded. If so, the callback is fired
  ###
  done = true
  cb = callbackRegistry[txId]
  modules = []
  for module in txnRegistry[txId]
    modl = getModule(module)
    if modl is false then done = false else modules.push(modl)
    if !done then break
  if done then cb.call(context, modules)

sendToXhr = (txId, module, path, cb) ->
  ###
  ## sendToXhr(txId, module, path, cb) ##
  _internal_ request a module at path using xmlHttpRequest. On retrieval, fire off cb
  ###
  xhr = getXHR()
  xhr.open("GET", path)
  xhr.onreadystatechange = () ->
    if xhr.readyState == 4 and xhr.status == 200 then cb.call(context, txId, module, path, xhr.responseText)
  xhr.send(null)

# request a file via iframe
sendToIframe = (txId, module, path, cb) ->
  ###
  ## sendToIframe(txId, module, path, cb) ##
  _internal_ request a module at path using Porthole + iframe. On retrieval, the cb will be fired
  ###
  xDomainRpc.postMessage("#{txId} #{module} #{path}")

getXHR = () ->
  ###
  ## getXHR() ##
  _internal_ get an XMLHttpRequest object
  ###
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

###
Main Payloads: require, require.ensure, etc
###
require = (moduleId) ->
  ###
  ## require(moduleId) ##
  Return the value of a module. This is a synchronous call, meaning the module needs
  to have already been loaded. If you are unsure about the module's existence, you
  should be using require.ensure() instead. For modules beyond the first tier, their
  shallow dependencies are resolved and block, so there is no need for require.ensure()
  beyond the topmost level.
  ###
  mod = getModule(moduleId)
  if mod is false then throw new Error("#{moduleId} not loaded")
  return mod

require.ensure = (moduleList, callback) ->
  ###
  ## require.ensure(moduleList, callback) ##
  Ensure the modules in moduleList (array) are loaded, and then execute callback
  (function). Use this instead of require() when you need to load shallow dependencies
  first.
  ###
  # init the iframe if required
  if config.xd? and !xDomainRpc and !pauseRequired
    createIframe()
    pauseRequired = true

  # our default behavior. Load everything
  # then, once everything says its loaded, call the callback
  run = () ->
    loadModules moduleList, () ->
      module = {}
      exports = {}
      module.exports = exports
      callback.call(context, require, module, exports)
  
  if pauseRequired then loadQueue.push(run)
  else run()

require.setModuleRoot = (root) ->
  ###
  ## require.setModuleRoot(root) ##
  set the base path for including your modules. This is used as the default if no
  items in the manifest can be located.
  
  Optionally, you can set root to a function. The return value of that function will
  be used instead. This can allow for very complex module configurations and branching
  with multiple CDNs such as in a complex production environment.
  ###
  if typeof(root) is "string" and root.lastIndexOf("/") isnt root.length then root = "#{root}/"
  config.path = root

require.setExpires = (expires) ->
  ###
  ## require.setExpires(expires) ##
  Set the time in seconds that files will persist in localStorage. Setting to 0 will disable
  localstorage caching.
  ###
  config.fileExpiration = expires

require.setCrossDomain = (local, remote) ->
  ###
  ## require.setCrossDomain(local, remote) ##
  Set a pair of URLs to relay files. You must have two relay files in your cross domain setup:
  
  * one relay file (local) on the same domain as the page hosting Inject
  * one relay file (remote) on the domain where you are hosting your root from setModuleRoot()
  
  The same require.setCrossDomain statement should be added to BOTH your relay.html files.
  ###
  config.xd = {}
  config.xd.inject = local
  config.xd.xhr = remote

require.clearCache = (version) ->
  ###
  ## require.clearCache(version) ##
  Remove the localStorage class at version. If no version is specified, the entire cache is cleared.
  ###
  clearFileRegistry(version)

require.manifest = (manifest) ->
  ###
  ## require.manifest(manifest) ##
  Provide a custom manifest for Inject. This maps module names to file paths, adds pointcuts, and more.
  The key is always the module name, and then inside of that key can be either
  
  * a String (the path that will be used for resolving that module)
  * an Object containing
  ** path (String or Function) a path to use for the module, behaves like setModuleRoot()
  ** pointcuts (Object) a set of Aspect Oriented functions to run before and after the function.
  
  The pointcuts are a unique solution that allows you to require() things like jQuery. A pointcut could,
  for example add an after() method which sets exports.$ to jQuery.noConflict(). This would restore the
  window to its unpoluted state and make jQuery actionable as a commonJS module without having to alter
  the original library.
  ###
  setUserModules(manifest)

require.run = (moduleId) ->
  ###
  ## require.run(moduleId) ##
  Execute the specified moduleId. This runs an ensure() to make sure the module has been loaded, and then
  execute it.
  ###
  foo = "bar"

# set context.require to the main inject object
# set an alternate interface in Inject in case things get clobbered
context.require = require
context.Inject = {
  require: require
}

###
Porthole
###
Porthole = null
`
Porthole=(typeof Porthole=="undefined")||!Porthole?{}:Porthole;Porthole={trace:function(a){try{"Porthole: "+a;}catch(b){}},error:function(a){try{console.error("Porthole: "+a)}catch(b){}}};Porthole.WindowProxy=function(){};Porthole.WindowProxy.prototype={postMessage:function(){},addEventListener:function(a){},removeEventListener:function(a){}};Porthole.WindowProxyLegacy=function(a,b){if(b===undefined){b=""}this.targetWindowName=b;this.eventListeners=[];this.origin=window.location.protocol+"//"+window.location.host;if(a!==null){this.proxyIFrameName=this.targetWindowName+"ProxyIFrame";this.proxyIFrameLocation=a;this.proxyIFrameElement=this.createIFrameProxy()}else{this.proxyIFrameElement=null}};Porthole.WindowProxyLegacy.prototype={getTargetWindowName:function(){return this.targetWindowName},getOrigin:function(){return this.origin},createIFrameProxy:function(){var a=document.createElement("iframe");a.setAttribute("id",this.proxyIFrameName);a.setAttribute("name",this.proxyIFrameName);a.setAttribute("src",this.proxyIFrameLocation);a.setAttribute("frameBorder","1");a.setAttribute("scrolling","auto");a.setAttribute("width",30);a.setAttribute("height",30);a.setAttribute("style","position: absolute; left: -100px; top:0px;");if(a.style.setAttribute){a.style.setAttribute("cssText","position: absolute; left: -100px; top:0px;")}document.body.appendChild(a);return a},postMessage:function(b,a){if(a===undefined){a="*"}if(this.proxyIFrameElement===null){Porthole.error("Can't send message because no proxy url was passed in the constructor")}else{sourceWindowName=window.name;this.proxyIFrameElement.setAttribute("src",this.proxyIFrameLocation+"#"+b+"&sourceOrigin="+escape(this.getOrigin())+"&targetOrigin="+escape(a)+"&sourceWindowName="+sourceWindowName+"&targetWindowName="+this.targetWindowName);this.proxyIFrameElement.height=this.proxyIFrameElement.height>50?50:100}},addEventListener:function(a){this.eventListeners.push(a);return a},removeEventListener:function(b){try{var a=this.eventListeners.indexOf(b);this.eventListeners.splice(a,1)}catch(c){this.eventListeners=[];Porthole.error(c)}},dispatchEvent:function(c){for(var b=0;b<this.eventListeners.length;b++){try{this.eventListeners[b](c)}catch(a){Porthole.error("Exception trying to call back listener: "+a)}}}};Porthole.WindowProxyHTML5=function(a,b){if(b===undefined){b=""}this.targetWindowName=b};Porthole.WindowProxyHTML5.prototype={postMessage:function(b,a){if(a===undefined){a="*"}if(this.targetWindowName===""){targetWindow=top}else{targetWindow=parent.frames[this.targetWindowName]}targetWindow.postMessage(b,a)},addEventListener:function(a){window.addEventListener("message",a,false);return a},removeEventListener:function(a){window.removeEventListener("message",a,false)},dispatchEvent:function(b){var a=document.createEvent("MessageEvent");a.initMessageEvent("message",true,true,b.data,b.origin,1,window,null);window.dispatchEvent(a)}};if(typeof window.postMessage!="function"){Porthole.trace("Using legacy browser support");Porthole.WindowProxy=Porthole.WindowProxyLegacy;Porthole.WindowProxy.prototype=Porthole.WindowProxyLegacy.prototype}else{Porthole.trace("Using built-in browser support");Porthole.WindowProxy=Porthole.WindowProxyHTML5;Porthole.WindowProxy.prototype=Porthole.WindowProxyHTML5.prototype}Porthole.WindowProxy.splitMessageParameters=function(c){if(typeof c=="undefined"||c===null){return null}var e=[];var d=c.split(/&/);for(var b in d){var a=d[b].split("=");if(typeof(a[1])=="undefined"){e[a[0]]=""}else{e[a[0]]=a[1]}}return e};Porthole.MessageEvent=function MessageEvent(c,a,b){this.data=c;this.origin=a;this.source=b};Porthole.WindowProxyDispatcher={forwardMessageEvent:function(c){var b=document.location.hash;if(b.length>0){b=b.substr(1);m=Porthole.WindowProxyDispatcher.parseMessage(b);if(m.targetWindowName===""){targetWindow=top}else{targetWindow=parent.frames[m.targetWindowName]}var a=Porthole.WindowProxyDispatcher.findWindowProxyObjectInWindow(targetWindow,m.sourceWindowName);if(a){if(a.origin==m.targetOrigin||m.targetOrigin=="*"){c=new Porthole.MessageEvent(m.data,m.sourceOrigin,a);a.dispatchEvent(c)}else{Porthole.error("Target origin "+a.origin+" does not match desired target of "+m.targetOrigin)}}else{Porthole.error("Could not find window proxy object on the target window")}}},parseMessage:function(b){if(typeof b=="undefined"||b===null){return null}params=Porthole.WindowProxy.splitMessageParameters(b);var a={targetOrigin:"",sourceOrigin:"",sourceWindowName:"",data:""};a.targetOrigin=unescape(params.targetOrigin);a.sourceOrigin=unescape(params.sourceOrigin);a.sourceWindowName=unescape(params.sourceWindowName);a.targetWindowName=unescape(params.targetWindowName);var c=b.split(/&/);if(c.length>3){c.pop();c.pop();c.pop();c.pop();a.data=c.join("&")}return a},findWindowProxyObjectInWindow:function(a,c){if(a.RuntimeObject){a=a.RuntimeObject()}if(a){for(var b in a){try{if(a[b]!==null&&typeof a[b]=="object"&&a[b] instanceof a.Porthole.WindowProxy&&a[b].getTargetWindowName()==c){return a[b]}}catch(d){}}}return null},start:function(){if(window.addEventListener){window.addEventListener("resize",Porthole.WindowProxyDispatcher.forwardMessageEvent,false)}else{if(document.body.attachEvent){window.attachEvent("onresize",Porthole.WindowProxyDispatcher.forwardMessageEvent)}else{Porthole.error("Can't attach resize event")}}}};
`

###
JSON
###
JSON = context.JSON or null
`
JSON||(JSON={});
(function(){function k(a){return a<10?"0"+a:a}function o(a){p.lastIndex=0;return p.test(a)?'"'+a.replace(p,function(a){var c=r[a];return typeof c==="string"?c:"\\u"+("0000"+a.charCodeAt(0).toString(16)).slice(-4)})+'"':'"'+a+'"'}function l(a,j){var c,d,h,m,g=e,f,b=j[a];b&&typeof b==="object"&&typeof b.toJSON==="function"&&(b=b.toJSON(a));typeof i==="function"&&(b=i.call(j,a,b));switch(typeof b){case "string":return o(b);case "number":return isFinite(b)?String(b):"null";case "boolean":case "null":return String(b);case "object":if(!b)return"null";
e+=n;f=[];if(Object.prototype.toString.apply(b)==="[object Array]"){m=b.length;for(c=0;c<m;c+=1)f[c]=l(c,b)||"null";h=f.length===0?"[]":e?"[\n"+e+f.join(",\n"+e)+"\n"+g+"]":"["+f.join(",")+"]";e=g;return h}if(i&&typeof i==="object"){m=i.length;for(c=0;c<m;c+=1)typeof i[c]==="string"&&(d=i[c],(h=l(d,b))&&f.push(o(d)+(e?": ":":")+h))}else for(d in b)Object.prototype.hasOwnProperty.call(b,d)&&(h=l(d,b))&&f.push(o(d)+(e?": ":":")+h);h=f.length===0?"{}":e?"{\n"+e+f.join(",\n"+e)+"\n"+g+"}":"{"+f.join(",")+
"}";e=g;return h}}if(typeof Date.prototype.toJSON!=="function")Date.prototype.toJSON=function(){return isFinite(this.valueOf())?this.getUTCFullYear()+"-"+k(this.getUTCMonth()+1)+"-"+k(this.getUTCDate())+"T"+k(this.getUTCHours())+":"+k(this.getUTCMinutes())+":"+k(this.getUTCSeconds())+"Z":null},String.prototype.toJSON=Number.prototype.toJSON=Boolean.prototype.toJSON=function(){return this.valueOf()};var q=/[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
p=/[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,e,n,r={"\u0008":"\\b","\t":"\\t","\n":"\\n","\u000c":"\\f","\r":"\\r",'"':'\\"',"\\":"\\\\"},i;if(typeof JSON.stringify!=="function")JSON.stringify=function(a,j,c){var d;n=e="";if(typeof c==="number")for(d=0;d<c;d+=1)n+=" ";else typeof c==="string"&&(n=c);if((i=j)&&typeof j!=="function"&&(typeof j!=="object"||typeof j.length!=="number"))throw Error("JSON.stringify");return l("",
{"":a})};if(typeof JSON.parse!=="function")JSON.parse=function(a,e){function c(a,d){var g,f,b=a[d];if(b&&typeof b==="object")for(g in b)Object.prototype.hasOwnProperty.call(b,g)&&(f=c(b,g),f!==void 0?b[g]=f:delete b[g]);return e.call(a,d,b)}var d,a=String(a);q.lastIndex=0;q.test(a)&&(a=a.replace(q,function(a){return"\\u"+("0000"+a.charCodeAt(0).toString(16)).slice(-4)}));if(/^[\],:{}\s]*$/.test(a.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g,"@").replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g,
"]").replace(/(?:^|:|,)(?:\s*\[)+/g,"")))return d=eval("("+a+")"),typeof e==="function"?c({"":d},""):d;throw new SyntaxError("JSON.parse");}})();
`

###
PersistJS
###
Persist = null
`
Persist=function(){var f,h,g,k,m,j;j=function(){var a=["expires","path","domain"],b=escape,c=unescape,d=document,e,g=function(c,d){var l,e,g,f=[],h=arguments.length>2?arguments[2]:{};f.push(b(c)+"="+b(d));for(l=0;l<a.length;l++)e=a[l],(g=h[e])&&f.push(e+"="+g);h.secure&&f.push("secure");return f.join("; ")};e={set:function(a,b){var c=arguments.length>2?arguments[2]:{},e=new Date;e.setTime(e.getTime());var f={};if(c.expires)c.expires*=864E5,f.expires=new Date(e.getTime()+c.expires),f.expires=f.expires.toGMTString();
e=["path","domain","secure"];for(i=0;i<e.length;i++)c[e[i]]&&(f[e[i]]=c[e[i]]);c=g(a,b,f);d.cookie=c;return b},has:function(a){var a=b(a),c=d.cookie,e=c.indexOf(a+"="),c=c.substring(0,a.length);return!e&&a!=c||e<0?!1:!0},get:function(a){var a=b(a),e=d.cookie,f=e.indexOf(a+"="),g=f+a.length+1,h=e.substring(0,a.length);if(!f&&a!=h||f<0)return null;a=e.indexOf(";",g);if(a<0)a=e.length;return c(e.substring(g,a))},remove:function(a){var b=e.get(a);d.cookie=g(a,"",{expires:"Thu, 01-Jan-1970 00:00:01 GMT"});
return b},keys:function(){var a=d.cookie.split("; "),b,e,f=[];for(b=0;b<a.length;b++)e=a[b].split("="),f.push(c(e[0]));return f},all:function(){var a=d.cookie.split("; "),b,e,f=[];for(b=0;b<a.length;b++)e=a[b].split("="),f.push([c(e[0]),c(e[1])]);return f},version:"0.2.1",enabled:!1};e.enabled=function(){var a=new Date,a=a.toGMTString();this.set("__EC_TEST__",a);return this.enabled=this.remove("__EC_TEST__")==a}.call(e);return e}();m=function(){};g=function(a){return"PS"+a.replace(/_/g,"__").replace(/ /g,
"_s")};C={search_order:"gears,localstorage,whatwg_db,globalstorage,flash,ie,cookie".split(","),name_re:/^[a-z][a-z0-9_ -]+$/i,methods:"init,get,set,remove,load,save".split(","),sql:{version:"1",create:"CREATE TABLE IF NOT EXISTS persist_data (k TEXT UNIQUE NOT NULL PRIMARY KEY, v TEXT NOT NULL)",get:"SELECT v FROM persist_data WHERE k = ?",set:"INSERT INTO persist_data(k, v) VALUES (?, ?)",remove:"DELETE FROM persist_data WHERE k = ?"},flash:{div_id:"_persist_flash_wrap",id:"_persist_flash",path:"persist.swf",
size:{w:1,h:1},args:{autostart:!0}}};h={gears:{size:-1,test:function(){return window.google&&window.google.gears?!0:!1},methods:{transaction:function(a){var b=this.db;b.execute("BEGIN").close();a.call(this,b);b.execute("COMMIT").close()},init:function(){var a;a=this.db=google.gears.factory.create("beta.database");a.open(g(this.name));a.execute(C.sql.create).close()},get:function(a,b,c){var d,e=C.sql.get;b&&this.transaction(function(f){d=f.execute(e,[a]);d.isValidRow()?b.call(c||this,!0,d.field(0)):
b.call(c||this,!1,null);d.close()})},set:function(a,b,c,d){var e=C.sql.remove,f=C.sql.set;this.transaction(function(g){g.execute(e,[a]).close();g.execute(f,[a,b]).close();c&&c.call(d||this,!0,b)})},remove:function(a,b,c){var d=C.sql.get;sql=C.sql.remove;this.transaction(function(e){b?(r=e.execute(d,[a]),r.isValidRow()?(val=r.field(0),e.execute(sql,[a]).close(),b.call(c||this,!0,val)):b.call(c||this,!1,null),r.close()):e.execute(sql,[a]).close()})}}},whatwg_db:{size:204800,test:function(){return!window.openDatabase?
!1:!window.openDatabase("PersistJS Test",C.sql.version,"Persistent database test.",h.whatwg_db.size)?!1:!0},methods:{transaction:function(a){if(!this.db_created){var b=C.sql.create;this.db.transaction(function(a){a.executeSql(b,[],function(){this.db_created=!0})},m)}this.db.transaction(a)},init:function(){this.db=openDatabase(this.name,C.sql.version,this.o.about||"Persistent storage for "+this.name,this.o.size||h.whatwg_db.size)},get:function(a,b,c){var d=C.sql.get;b&&(c=c||this,this.transaction(function(e){e.executeSql(d,
[a],function(a,d){d.rows.length>0?b.call(c,!0,d.rows.item(0).v):b.call(c,!1,null)})}))},set:function(a,b,c,d){var e=C.sql.remove,f=C.sql.set;this.transaction(function(g){g.executeSql(e,[a],function(){g.executeSql(f,[a,b],function(){c&&c.call(d||this,!0,b)})})});return b},remove:function(a,b,c){var d=C.sql.get;sql=C.sql.remove;this.transaction(function(e){b?e.executeSql(d,[a],function(d,e){if(e.rows.length>0){var f=e.rows.item(0).v;d.executeSql(sql,[a],function(){b.call(c||this,!0,f)})}else b.call(c||
this,!1,null)}):e.executeSql(sql,[a])})}}},globalstorage:{size:5242880,test:function(){return window.globalStorage?!0:!1},methods:{key:function(a){return g(this.name)+g(a)},init:function(){this.store=globalStorage[this.o.domain]},get:function(a,b,c){a=this.key(a);b&&b.call(c||this,!0,this.store.getItem(a))},set:function(a,b,c,d){a=this.key(a);this.store.setItem(a,b);c&&c.call(d||this,!0,b)},remove:function(a,b,c){var d,a=this.key(a);d=this.store[a];this.store.removeItem(a);b&&b.call(c||this,d!==null,
d)}}},localstorage:{size:-1,test:function(){return window.localStorage?!0:!1},methods:{key:function(a){return g(this.name)+g(a)},init:function(){this.store=localStorage},get:function(a,b,c){a=this.key(a);b&&b.call(c||this,!0,this.store.getItem(a))},set:function(a,b,c,d){a=this.key(a);this.store.setItem(a,b);c&&c.call(d||this,!0,b)},remove:function(a,b,c){var d,a=this.key(a);d=this.getItem(a);this.store.removeItem(a);b&&b.call(c||this,d!==null,d)}}},ie:{prefix:"_persist_data-",size:65536,test:function(){return window.ActiveXObject?
!0:!1},make_userdata:function(a){var b=document.createElement("div");b.id=a;b.style.display="none";b.addBehavior("#default#userData");document.body.appendChild(b);return b},methods:{init:function(){var a=h.ie.prefix+g(this.name);this.el=h.ie.make_userdata(a);this.o.defer&&this.load()},get:function(a,b,c){a=g(a);this.o.defer||this.load();a=this.el.getAttribute(a);b&&b.call(c||this,a?!0:!1,a)},set:function(a,b,c,d){a=g(a);this.el.setAttribute(a,b);this.o.defer||this.save();c&&c.call(d||this,!0,b)},
load:function(){this.el.load(g(this.name))},save:function(){this.el.save(g(this.name))}}},cookie:{delim:":",size:4E3,test:function(){return f.Cookie.enabled?!0:!1},methods:{key:function(a){return this.name+h.cookie.delim+a},get:function(a,b,c,d){a=this.key(a);b=j.get(a);c&&c.call(d||this,b!=null,b)},set:function(a,b,c,d){a=this.key(a);j.set(a,b,this.o);c&&c.call(d||this,!0,b)},remove:function(a,b,c,d){a=this.key(a);b=j.remove(a);c&&c.call(d||this,b!=null,b)}}},flash:{test:function(){return!window.SWFObject||
!deconcept||!deconcept.SWFObjectUtil?!1:deconcept.SWFObjectUtil.getPlayerVersion().major>=8?!0:!1},methods:{init:function(){if(!h.flash.el){var a,b,c,d=C.flash;c=document.createElement("div");c.id=d.div_id;document.body.appendChild(c);a=new SWFObject(this.o.swf_path||d.path,d.id,d.size.w,d.size.h,"8");for(b in d.args)a.addVariable(b,d.args[b]);a.write(c);h.flash.el=document.getElementById(d.id)}this.el=h.flash.el},get:function(a,b,c){a=g(a);a=this.el.get(this.name,a);b&&b.call(c||this,a!==null,a)},
set:function(a,b,c,d){a=g(a);this.el.set(this.name,a,b);c&&c.call(d||this,!0,b)},remove:function(a,b,c){a=g(a);a=this.el.remove(this.name,a);b&&b.call(c||this,!0,a)}}}};k=function(){var a,b,c,d;c=C.methods;var e=C.search_order;for(a=0,b=c.length;a<b;a++)f.Store.prototype[c[a]]=m;f.type=null;f.size=-1;for(a=0,b=e.length;!f.type&&a<b;a++)if(c=h[e[a]],c.test())for(d in f.type=e[a],f.size=c.size,c.methods)f.Store.prototype[d]=c.methods[d];f._init=!0};f={VERSION:"0.1.0",type:null,size:0,add:function(a){h[a.id]=
a;C.search_order=[a.id].concat(C.search_order);k()},remove:function(a){var b=C.search_order.indexOf(a);b<0||(C.search_order.splice(b,1),delete h[a],k())},Cookie:j,Store:function(a,b){if(!C.name_re.exec(a))throw Error("Invalid name");if(!f.type)throw Error("No suitable storage found");b=b||{};this.name=a;b.domain=b.domain||location.hostname||"localhost.localdomain";this.o=b;b.expires=b.expires||730;b.path=b.path||"/";this.init()}};k();return f}();
`