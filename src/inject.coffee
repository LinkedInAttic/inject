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
xDomainRpc = null                   # a cross domain RPC object (Porthole)
fileStorageToken = "FILEDB"         # a storagetoken identifier we use (lscache)
fileStore = "Inject FileStorage"    # file store to use
namespace = "Inject"                # the namespace for inject() that is publicly reachable
fileExpiration = 1440              # the default time (in minutes lscache) to cache a file for (one day)
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
  ([\w/\.\:]+?)                       # (1) capture word characters, forward slashes, dots, and colons (at least one)
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
    module.setExports = function(xobj) {
      for (var name in module.exports) {
        if (module.exports.hasOwnProperty(name)) {
          throw new Error("module.setExports() failed: Module Exports has already been defined");
        }
      }
      module.exports = xobj;
      return module.exports;
    }
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

isCached = (path) ->
  ###
  ## isCached(mpath) ##
  _internal_ test if a file is in the cache validity has been moved to lscache
  ###
  return fileRegistry? and fileRegistry[path]?

getFile = (path, cb) ->
  ###
  ## getFile(path, cb) ##
  _internal_ Get a file by its path. Asynchronously calls its callback.
  Uses LocalStorage or UserData if available
  ###
  token = "#{fileStorageToken}#{schemaVersion}#{path}"
  
  if !fileRegistry
    fileRegistry = {}

  if fileRegistry[path] and fileRegistry[path].length
    # the file registry object exists, so we have loaded the content
    # return the content with the cb set to true
    return cb(true, fileRegistry[path])
  else
    # With no file registry, attempt to load from local storage
    # if the token exists, parse it. If the path is cached, then use the cached item
    # otherwise, mark the item as false
    # if there is nothing in cache, create the fileRegistry object
    
    if config.fileExpiration is 0
       return cb(false, null)
    else   
      file = lscache.get(token)
      
      if file and typeof(file) is "string" and file.length
        fileRegistry[path] = file
        return cb(true, fileRegistry[path])
      else
        return cb(false, null)
  
    
saveFile = (path, file) ->
  ###
  ## saveFile(path, file) ##
  _internal_ Save a file for resource `path` into LocalStorage or UserData
  Also updates the internal fileRegistry
  ###
  
  token = "#{fileStorageToken}#{schemaVersion}#{path}"
  
  if isCached(path) then return
  fileRegistry[path] = file
  # using minutes convention because lscache  does the expire conversion in added minutes
  lscache.set(token, file, config.fileExpiration)
  
clearFileRegistry = (version = schemaVersion) ->
  ###
  ## clearFileRegistry(version = schemaVersion) ##
  _internal_ Clears the internal file registry at `version`
  clearing all local storage keys that relate to the fileStorageToken and version
  ###
  token = "#{fileStorageToken}#{version}"
  
  lscache.remove(lkey) for lkey,file of localStorage when lkey.indexOf(token) isnt -1 
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
  
  # shortcut. If modList is undefined, then call the callback
  if modList.length is 0 then return cb.apply(context, [])
  
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
  runCmd = "#{header}\n#{text}\n#{footer}\n//@ sourceURL=#{path}"
  
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
  if txnRegistry[txId]
    for module in txnRegistry[txId]
      modl = getModule(module)
      if modl is false then done = false else modules.push(modl)
      if !done then break
  if done and cb
    delete callbackRegistry[txId]
    delete txnRegistry[txId]
    cb.apply(context, modules)

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
  ## TODO require.run(moduleId) ##
  Execute the specified moduleId. This runs an ensure() to make sure the module has been loaded, and then
  execute it.
  ###

define = (moduleId, deps, callback) ->
  ###
  ## define(moduleId, deps, callback) ##
  Define a module with moduleId, run require.ensure to make sure all dependency modules have been loaded, and then
  apply the callback function with an array of dependency module objects, add the callback return and moduleId into
  moduleRegistry list.
  ###
  # Allow for anonymous functions, adjust args appropriately
  if typeof(moduleId) isnt "string"
    callback = deps
    deps = moduleId
    moduleId = null

  # This module have no dependencies
  if Object.prototype.toString.call(deps) isnt "[object Array]"
    callback = deps
    deps = []

  # Strip out 'require', 'exports', 'module' in deps array for require.ensure
  strippedDeps = []
  for dep in deps
    if dep isnt "exports" and dep isnt "require" and dep isnt "module" then strippedDeps.push(dep)

  require.ensure(strippedDeps, (require, module, exports) ->
    # already defined: require, module, exports
    # create an array with all dependency modules object
    args = []
    for dep in deps
      switch dep
        when "require" then args.push(require)
        when "exports" then args.push(exports)
        when "module" then args.push(module)
        else args.push(require(dep))

    # if callback is an object, save it to exports
    # if callback is a function, apply it with args, save the return object to exports
    if typeof(callback) is 'function'
      returnValue = callback.apply(context, args);
      count = 0
      count++ for own item in module.exports
      exports = returnValue if count is 0 and typeof(returnValue) isnt "undefined"
    else if typeof(callback) is 'object'
      exports = callback

    # save moduleId, exports into module list
    # we only save modules with an ID
    if moduleId then saveModule(moduleId, exports);
  )

# To allow a clear indicator that a global define function conforms to the AMD API
define.amd =
  jQuery: true # jQuery requires explicitly defining inside of define.amd

# set context.require to the main inject object
# set context.define to the main inject object
# set an alternate interface in Inject in case things get clobbered
context.require = require
context.define = define
context.Inject = {
  require: require,
  define: define,
  debug: {
    fileRegistry: fileRegistry,
    loadQueue: loadQueue,
    userModules: userModules,
    moduleRegistry: moduleRegistry,
    modulePathRegistry: modulePathRegistry,
    callbackRegistry: callbackRegistry,
    txnRegistry: txnRegistry
  }  
}

###
Porthole
###
Porthole = null
`
Porthole="undefined"==typeof Porthole||!Porthole?{}:Porthole;Porthole={trace:function(){},error:function(a){try{console.error("Porthole: "+a)}catch(b){}},WindowProxy:function(){}};Porthole.WindowProxy.prototype={postMessage:function(){},addEventListener:function(){},removeEventListener:function(){}};
Porthole.WindowProxyLegacy=function(a,b){void 0===b&&(b="");this.targetWindowName=b;this.eventListeners=[];this.origin=window.location.protocol+"//"+window.location.host;null!==a?(this.proxyIFrameName=this.targetWindowName+"ProxyIFrame",this.proxyIFrameLocation=a,this.proxyIFrameElement=this.createIFrameProxy()):this.proxyIFrameElement=null};
Porthole.WindowProxyLegacy.prototype={getTargetWindowName:function(){return this.targetWindowName},getOrigin:function(){return this.origin},createIFrameProxy:function(){var a=document.createElement("iframe");a.setAttribute("id",this.proxyIFrameName);a.setAttribute("name",this.proxyIFrameName);a.setAttribute("src",this.proxyIFrameLocation);a.setAttribute("frameBorder","1");a.setAttribute("scrolling","auto");a.setAttribute("width",30);a.setAttribute("height",30);a.setAttribute("style","position: absolute; left: -100px; top:0px;");
a.style.setAttribute&&a.style.setAttribute("cssText","position: absolute; left: -100px; top:0px;");document.body.appendChild(a);return a},postMessage:function(a,b){void 0===b&&(b="*");null===this.proxyIFrameElement?Porthole.error("Can't send message because no proxy url was passed in the constructor"):(sourceWindowName=window.name,this.proxyIFrameElement.setAttribute("src",this.proxyIFrameLocation+"#"+a+"&sourceOrigin="+escape(this.getOrigin())+"&targetOrigin="+escape(b)+"&sourceWindowName="+sourceWindowName+
"&targetWindowName="+this.targetWindowName),this.proxyIFrameElement.height=50<this.proxyIFrameElement.height?50:100)},addEventListener:function(a){this.eventListeners.push(a);return a},removeEventListener:function(a){try{this.eventListeners.splice(this.eventListeners.indexOf(a),1)}catch(b){this.eventListeners=[],Porthole.error(b)}},dispatchEvent:function(a){for(var b=0;b<this.eventListeners.length;b++)try{this.eventListeners[b](a)}catch(c){Porthole.error("Exception trying to call back listener: "+
c)}}};Porthole.WindowProxyHTML5=function(a,b){void 0===b&&(b="");this.targetWindowName=b};
Porthole.WindowProxyHTML5.prototype={postMessage:function(a,b){void 0===b&&(b="*");targetWindow=""===this.targetWindowName?top:parent.frames[this.targetWindowName];targetWindow.postMessage(a,b)},addEventListener:function(a){window.addEventListener("message",a,!1);return a},removeEventListener:function(a){window.removeEventListener("message",a,!1)},dispatchEvent:function(a){var b=document.createEvent("MessageEvent");b.initMessageEvent("message",!0,!0,a.data,a.origin,1,window,null);window.dispatchEvent(b)}};
"function"!=typeof window.postMessage?(Porthole.trace("Using legacy browser support"),Porthole.WindowProxy=Porthole.WindowProxyLegacy,Porthole.WindowProxy.prototype=Porthole.WindowProxyLegacy.prototype):(Porthole.trace("Using built-in browser support"),Porthole.WindowProxy=Porthole.WindowProxyHTML5,Porthole.WindowProxy.prototype=Porthole.WindowProxyHTML5.prototype);
Porthole.WindowProxy.splitMessageParameters=function(a){if("undefined"==typeof a||null===a)return null;var b=[],a=a.split(/&/),c;for(c in a){var d=a[c].split("=");b[d[0]]="undefined"==typeof d[1]?"":d[1]}return b};Porthole.MessageEvent=function(a,b,c){this.data=a;this.origin=b;this.source=c};
Porthole.WindowProxyDispatcher={forwardMessageEvent:function(a){a=document.location.hash;if(0<a.length){a=a.substr(1);m=Porthole.WindowProxyDispatcher.parseMessage(a);targetWindow=""===m.targetWindowName?top:parent.frames[m.targetWindowName];var b=Porthole.WindowProxyDispatcher.findWindowProxyObjectInWindow(targetWindow,m.sourceWindowName);b?b.origin==m.targetOrigin||"*"==m.targetOrigin?(a=new Porthole.MessageEvent(m.data,m.sourceOrigin,b),b.dispatchEvent(a)):Porthole.error("Target origin "+b.origin+
" does not match desired target of "+m.targetOrigin):Porthole.error("Could not find window proxy object on the target window")}},parseMessage:function(a){if("undefined"==typeof a||null===a)return null;params=Porthole.WindowProxy.splitMessageParameters(a);var b={targetOrigin:"",sourceOrigin:"",sourceWindowName:"",data:""};b.targetOrigin=unescape(params.targetOrigin);b.sourceOrigin=unescape(params.sourceOrigin);b.sourceWindowName=unescape(params.sourceWindowName);b.targetWindowName=unescape(params.targetWindowName);
a=a.split(/&/);if(3<a.length)a.pop(),a.pop(),a.pop(),a.pop(),b.data=a.join("&");return b},findWindowProxyObjectInWindow:function(a,b){a.RuntimeObject&&(a=a.RuntimeObject());if(a)for(var c in a)try{if(null!==a[c]&&"object"==typeof a[c]&&a[c]instanceof a.Porthole.WindowProxy&&a[c].getTargetWindowName()==b)return a[c]}catch(d){}return null},start:function(){window.addEventListener?window.addEventListener("resize",Porthole.WindowProxyDispatcher.forwardMessageEvent,!1):document.body.attachEvent?window.attachEvent("onresize",
Porthole.WindowProxyDispatcher.forwardMessageEvent):Porthole.error("Can't attach resize event")}};
`

###
lscache library
###
lscache=null
`
var lscache=function(){function g(){return Math.floor((new Date).getTime()/6E4)}function l(a,b,f){function o(){try{localStorage.setItem(a+c,g()),0<f?(localStorage.setItem(a+d,g()+f),localStorage.setItem(a,b)):0>f||0===f?(localStorage.removeItem(a+c),localStorage.removeItem(a+d),localStorage.removeItem(a)):localStorage.setItem(a,b)}catch(h){if("QUOTA_EXCEEDED_ERR"===h.name||"NS_ERROR_DOM_QUOTA_REACHED"==h.name){if(0===i.length&&!m)return localStorage.removeItem(a+c),localStorage.removeItem(a+d),localStorage.removeItem(a),
!1;m&&(m=!1);if(!e){for(var n=0,l=localStorage.length;n<l;n++)if(j=localStorage.key(n),-1<j.indexOf(c)){var p=j.split(c)[0];i.push({key:p,touched:parseInt(localStorage[j],10)})}i.sort(function(a,b){return a.touched-b.touched})}if(k=i.shift())localStorage.removeItem(k.key+c),localStorage.removeItem(k.key+d),localStorage.removeItem(k.key);o()}}}var e=!1,m=!0,i=[],j,k;o()}var d="-EXP",c="-LRU",e;try{e=!!localStorage.getItem}catch(q){e=!1}var h=null!=window.JSON;return{set:function(a,b,c){if(e){if("string"!=
typeof b){if(!h)return;try{b=JSON.stringify(b)}catch(d){return}}l(a,b,c)}},get:function(a){function b(a){if(h)try{return JSON.parse(localStorage.getItem(a))}catch(b){return localStorage.getItem(a)}else return localStorage.getItem(a)}if(!e)return null;if(localStorage.getItem(a+d)){var f=parseInt(localStorage.getItem(a+d),10);if(g()>=f)localStorage.removeItem(a),localStorage.removeItem(a+d),localStorage.removeItem(a+c);else return localStorage.setItem(a+c,g()),b(a)}else if(localStorage.getItem(a))return localStorage.setItem(a+
c,g()),b(a);return null},remove:function(a){if(!e)return null;localStorage.removeItem(a);localStorage.removeItem(a+d);localStorage.removeItem(a+c)}}}();
`