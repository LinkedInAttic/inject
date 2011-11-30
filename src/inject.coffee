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
userConfig =
  moduleRoot: null                  # the module root location
  fileExpires: 1440                 # the default expiry for items in lscache (in minutes)
  xd:
    inject: null                    # the location of the relay.html file, same domain as inject
    xhr: null                       # the location of the relay.html file, same domain as moduleRoot
undef = undef                       # undefined
schemaVersion = 1                   # version of inject()'s localstorage schema
context = this                      # context is our local scope. Should be "window"
pauseRequired = false               # can we run immediately? when using iframe transport, the answer is no
_db =                               # internal database of modules and transactions
  moduleRegistry: {}                # a registry of modules that have been loaded
  transactionRegistry: {}           # a registry of transaction ids and what modules were associated
  transactionRegistryCounter: 0     # a unique id for transactionRegistry
  loadQueue: []                     # a queue used when performing iframe based cross domain loads
  rulesQueue: []                    # the collection of rules for processing
  fileQueue: []                     # a list of callbacks waiting on a file download
xDomainRpc = null                   # a cross domain RPC object (Porthole)
fileStorageToken = "FILEDB"         # a storagetoken identifier we use (lscache)
fileStore = "Inject FileStorage"    # file store to use
namespace = "Inject"                # the namespace for inject() that is publicly reachable
userModules = {}                    # any mappings for module => handling defined by the user
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
  ^(.+?)[\s]                          # (1) Anything up to a space (module id)
  ([\w\W]+)$                          # (2) Any text up until the end of the string
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

# ### This section is the getters and setters for the internal database
# ### do not manipulate the _db object directly
# ##########
# {} added for folding in TextMate
db = {
  module:
    create: (moduleId) ->
      ###
      ## create(moduleId) ##
      create a registry entry for tracking a module
      ###
      registry = _db.moduleRegistry
      if !registry[moduleId]
        registry[moduleId] = {
          exports: null
          path: null
          file: null
          loading: false
          rulesApplied: false
          requires: []
          staticRequires: []
          transactions: []
          exec: null
          pointcuts:
            before: []
            after: []
        }
    getExports: (moduleId) ->
      registry = _db.moduleRegistry
      if registry[moduleId]?.exports then return registry[moduleId].exports
      if registry[moduleId]?.exec
        registry[moduleId].exec()
        registry[moduleId].exec = null
        return registry[moduleId].exports
      return false
    setExports: (moduleId, exports) ->
      registry = _db.moduleRegistry
      db.module.create(moduleId)
      registry[moduleId].exports = exports
    getPointcuts: (moduleId) ->
      registry = _db.moduleRegistry
      if registry[moduleId]?.pointcuts then return registry[moduleId].pointcuts
    setPointcuts: (moduleId, pointcuts) ->
      registry = _db.moduleRegistry
      db.module.create(moduleId)
      registry[moduleId].pointcuts = pointcuts
    getRequires: (moduleId) ->
      registry = _db.moduleRegistry
      if registry[moduleId]?.requires then return registry[moduleId].requires
    setRequires: (moduleId, requires) ->
      registry = _db.moduleRegistry
      db.module.create(moduleId)
      registry[moduleId].requires = requires
    getStaticRequires: (moduleId) ->
      registry = _db.moduleRegistry
      if registry[moduleId]?.staticRequires then return registry[moduleId].staticRequires
    setStaticRequires: (moduleId, staticRequires) ->
      registry = _db.moduleRegistry
      db.module.create(moduleId)
      registry[moduleId].staticRequires = staticRequires
    getRulesApplied: (moduleId) ->
      registry = _db.moduleRegistry
      if registry[moduleId]?.rulesApplied then return registry[moduleId].rulesApplied else return false
    setRulesApplied: (moduleId, rulesApplied) ->
      registry = _db.moduleRegistry
      db.module.create(moduleId)
      registry[moduleId].rulesApplied = rulesApplied
    getPath: (moduleId) ->
      registry = _db.moduleRegistry
      if registry[moduleId]?.path then return registry[moduleId].path else return false
    setPath: (moduleId, path) ->
      registry = _db.moduleRegistry
      db.module.create(moduleId)
      registry[moduleId].path = path
    getFile: (moduleId) ->
      registry = _db.moduleRegistry
      path = db.module.getPath(moduleId)
      token = "#{fileStorageToken}#{schemaVersion}#{path}"
      if registry[moduleId]?.file then return registry[moduleId].file
      file = lscache.get(token)
      if file and typeof(file) is "string" and file.length
        db.module.setFile(moduleId, file)
        return file
      return false
    setFile: (moduleId, file) ->
      registry = _db.moduleRegistry
      db.module.create(moduleId)
      registry[moduleId].file = file
      path = db.module.getPath(moduleId)
      token = "#{fileStorageToken}#{schemaVersion}#{path}"
      lscache.set(token, file, userConfig.fileExpires)
    clearAllFiles: () ->
      registry = _db.moduleRegistry
      for own moduleId, data of registry
        data.file = null
        data.loading = false
    getTransactions: (moduleId) ->
      registry = _db.moduleRegistry
      if registry[moduleId]?.transactions then return registry[moduleId].transactions else return false
    addTransaction: (moduleId, txnId) ->
      registry = _db.moduleRegistry
      db.module.create(moduleId)
      registry[moduleId].transactions.push(txnId)
    removeTransaction: (moduleId, txnId) ->
      registry = _db.moduleRegistry
      db.module.create(moduleId)
      newTransactions = []
      for testTxnId of registry[moduleId].transactions
        if testTxnId isnt txnId then newTransactions.push(testTxnId)
      registry[moduleId].transactions = newTransactions
    getLoading: (moduleId) ->
      registry = _db.moduleRegistry
      if registry[moduleId]?.loading then return registry[moduleId].loading else return false
    setLoading: (moduleId, loading) ->
      registry = _db.moduleRegistry
      db.module.create(moduleId)
      registry[moduleId].loading = loading
  txn:
    create: () ->
      id = _db.transactionRegistryCounter++
      _db.transactionRegistry[id] = 0
      return id
    add: (txnId) ->
      _db.transactionRegistry[txnId]++
    subtract: (txnId) ->
      _db.transactionRegistry[txnId]--
    get: (txnId) ->
      return _db.transactionRegistry[txnId]
    remove: (txnId) ->
      _db.transactionRegistry[txnId] = null
      delete _db.transactionRegistry[txnId]
  queue:
    load:
      add: (item) ->
        _db.loadQueue.push(item)
      get: () ->
        return _db.loadQueue
    rules:
      add: (item) ->
        _db.rulesQueue.push(item)
        _db.rulesQueueDirty = true
      get: () ->
        if _db.rulesQueueDirty
          _db.rulesQueueDirty = false
          _db.rulesQueue.sort (a, b) ->
            return b.weight - a.weight
        return _db.rulesQueue
      size: () ->
        return _db.rulesQueue.length
    file:
      add: (moduleId, item) ->
        if !_db.fileQueue[moduleId] then !_db.fileQueue[moduleId] = []
        _db.fileQueue[moduleId].push(item)
      get: (moduleId) ->
        if _db.fileQueue[moduleId] then return _db.fileQueue[moduleId] else return []
      clear: (moduleId) ->
        if _db.fileQueue[moduleId] then _db.fileQueue[moduleId] = []
}
# ##########
# ### End getter/setter db section

class treeNode
  ###
  ## treeNode [class] ##
  _internal_ used for constructing the dependency tree
  once built, we can perform a post-order traversal which identifies
  the order we are supposed to execute our required files
  ###
  constructor: (value) ->
    ###
    ## constructor(value) ##
    set the value for the node, create null values for parent, left right
    ###
    @value = value
    @children = []
    @parent = null
    @left = null
    @right = null
  getValue: () ->
    ###
    ## getValue() ##
    get the value of the node
    ###
    return @value
  addChild: (node) ->
    ###
    ## addChild(node) ##
    add a child node to the existing tree. Creates left, right, and parent relationships
    ###
    if @children.length > 0
      rightChild = @children[@children.length - 1]
      node.setLeft(rightChild)
      rightChild.setRight(node)
    @children.push(node)
    node.setParent(this)
  getChildren: () ->
    ###
    ## getChildren() ##
    get the children for the existing tree
    ###
    return @children
  setLeft: (node) ->
    ###
    ## setLeft(node) ##
    set the sibling to the left of this current node
    ###
    @left = node
  getLeft: () ->
    ###
    ## getLeft() ##
    get the left / previous sibling
    ###
    return @left
  setRight: (node) ->
    ###
    ## setRight(node) ##
    set the sibling to the right of this current node
    ###
    @right = node
  getRight: () ->
    ###
    ## getRight() ##
    get the right / next sibling
    ###
    return @right
  setParent: (node) ->
    ###
    ## setParent(node) ##
    set the parent of this node
    ###
    @parent = node
  getParent: () ->
    ###
    ## getParent() ##
    get the parent of this node
    ###
    return @parent
  postOrder: () ->
    ###
    ## postOrder() ##
    Perform a post-order traversal of the tree, and return an array
    of the values. The order for post-order is left, right, parent
    ###
    output = []
    currentNode = this
    direction = null
    while (currentNode)
      # attempt to move down
      if currentNode.getChildren().length > 0 and direction isnt "up"
        direction = "down"
        currentNode = currentNode.getChildren()[0]
        continue
      
      # deepest point, record
      output.push(currentNode.getValue())
      
      # attempt to move right
      if currentNode.getRight()
        direction = "right"
        currentNode = currentNode.getRight()
        continue
      
      # attempt to move up
      if currentNode.getParent()
        direction = "up"
        currentNode = currentNode.getParent()
        continue
      
      # have finished the tree
      return output


setUserModules = (modl) ->
  ###
  ## setUserModules(modl) ##
  TODO: refactor into addRule commands
  _internal_ Set the collection of user defined modules
  ###
  userModules = modl 

clearFileRegistry = (version = schemaVersion) ->
  ###
  ## clearFileRegistry(version = schemaVersion) ##
  _internal_ Clears the internal file registry at `version`
  clearing all local storage keys that relate to the fileStorageToken and version
  ###
  token = "#{fileStorageToken}#{version}"
  lscache.remove(lkey) for lkey,file of localStorage when lkey.indexOf(token) isnt -1 
  if version is schemaVersion then db.module.clearAllFiles()

createIframe = () ->
  ###
  ## createIframe() ##
  _internal_ create an iframe to the xhr location
  ###
  src = userConfig?.xd?.xhr
  localSrc = userConfig?.xd?.inject
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
  xDomainRpc = new Porthole.WindowProxy(userConfig.xd.xhr+"#xhr", iframeName);
  xDomainRpc.addEventListener (event) ->
    if trimHost(event.origin) isnt trimHost(userConfig.xd.xhr) then return
    
    # Ready init
    if event.data is "READY"
      xDomainRpc.postMessage("READYREADY")
      pauseRequired = false
      item() for item in db.queue.load.get()
      return
    
    pieces = event.data.match(responseSlicer)
    processCallbacks(pieces[1], pieces[2])

getFormattedPointcuts = (moduleId) ->
  ###
  ## getFormattedPointcuts(moduleId) ##
  _internal_ get the [pointcuts](http://en.wikipedia.org/wiki/Pointcut) for a module if
  specified
  ###
  cuts = db.module.getPointcuts(moduleId)
  beforeCut = [";"]
  afterCut = [";"]
  
  for cut in cuts.before
    beforeCut.push(cut.toString().match(/.*?\{([\w\W]*)\}/m)[1])
  for cut in cuts.after
    afterCut.push(cut.toString().match(/.*?\{([\w\W]*)\}/m)[1])
  
  beforeCut.push(";")
  afterCut.push(";")
  return {
    before: beforeCut.join(";\n")
    after: afterCut.join(";\n")
  }
  
  noop = () -> return
  pointcuts =
    before: noop
    after: noop
  if !userModules[module] then return pointcuts
  definition = userModules[module]
  
  for cut, fn of pointcuts
    if definition[cut] then pointcuts[cut] = definition[cut]
  
  return pointcuts

dispatchTreeDownload = (id, tree, node, callback) ->
  tree.addChild(node)
  if db.module.getLoading(node.getValue()) is false
    db.txn.add(id)
    context.setTimeout( () ->
      downloadTree node, () ->
        db.txn.subtract(id)
        if db.txn.get(id) is 0
          db.txn.remove(id)
          callback()
    )

loadModules = (modList, callback) ->
  ###
  ## loadModules(modList, callback) ##
  _internal_ load a collection of modules in modList, and once they have all loaded, execute the callback cb
  ###
  
  # shortcut. If modList is undefined, then call the callback
  if modList.length is 0
    context.setTimeout(
      callback.apply(context, [])
    )
    return
  
  # Tree based traversal. For each module, we'll create a transaction
  # and each transaction will have its own dependency tree
  tree = new treeNode(null)
  id = db.txn.create()
  
  # internal method. After all branches of the tree have resolved
  # we can execute post-order all the modules. We can load them into
  # exports and run the callback
  execute = () ->
    executionOrder = tree.postOrder()
    for moduleId in executionOrder
      if moduleId is null then continue
      executeFile(moduleId)
    # everything executed. collect exports
    exports = []
    for moduleId in modList
      exports.push(db.module.getExports(moduleId))
    callback.apply(context, exports)
    return
  
  for moduleId in modList
    node = new treeNode(moduleId)
    dispatchTreeDownload(id, tree, node, execute)

downloadTree = (tree, callback) ->
  moduleId = tree.getValue()
  console.log "continuing dispatch of #{moduleId}"
  
  # apply the ruleset for this module if we haven't yet
  applyRules(moduleId) if db.module.getRulesApplied() is false
  
  # the callback every module has when it has been loaded
  onDownloadComplete = (moduleId, file) ->
    console.log "retrieved #{moduleId}"
    db.module.setFile(moduleId, file)
    analyzeFile(moduleId)
    requires = db.module.getRequires(moduleId)
    console.log "#{moduleId} requires #{requires}"
    id = db.txn.create()
    for req in requires
      node = new treeNode(req)
      dispatchTreeDownload(id, tree, node, callback)
    if db.txn.get(id) is 0
      db.txn.remove(id)
      context.setTimeout(callback)
  
  # download a file over xhr or cross domain
  download = () ->
    db.module.setLoading(moduleId, true)
    console.log "downloading #{moduleId}"
    if userConfig.xd.inject and userConfig.xd.xhr
      sendToIframe(moduleId, processCallbacks)
    else
      sendToXhr(moduleId, processCallbacks)
  
  # queue our results when the file completes
  db.queue.file.add(moduleId, onDownloadComplete)
  
  # if already loading, queue for later
  if db.module.getLoading(moduleId) then return
  
  # short cut. if downloaded, callback
  file = db.module.getFile(moduleId)
  if file and file.length > 0 then processCallbacks(moduleId, file) else download()

# run all callbacks for a given file
processCallbacks = (moduleId, file) ->
  console.log "processing callbacks for #{moduleId}"
  db.module.setLoading(moduleId, false)
  cbs = db.queue.file.get(moduleId)
  db.queue.file.clear(moduleId)
  cb(moduleId, file) for cb in cbs

analyzeFile = (moduleId) ->
  ###
  ## analyzeFile(moduleId) ##
  _internal_ scan a module's file for dependencies and record them
  ###
  requires = []
  uniques = {}
  while requireRegex.exec(db.module.getFile(moduleId))
    req = RegExp.$1
    requires.push(req) if uniques[req] isnt true
    uniques[req] = true
  for staticReq in db.module.getStaticRequires(moduleId)
    requires.push(staticReq) if uniques[staticReq] isnt true
    uniques[staticReq] = true
  db.module.setRequires(moduleId, requires)

applyRules = (moduleId) ->
  ###
  ## applyRules(moduleId) ##
  _internal_ normalize the path based on the module collection or any functions
  associated with its identifier
  ###
  workingPath = moduleId
  pointcuts =
    before: []
    after: []
  
  for rule in db.queue.rules.get()
    # start with workingPath, and begin applying rules
    isMatch = if typeof(rule.key) is "string" then (rule.key.toLowerCase() is workingPath.toLowerCase()) else rule.key.test(workingPath)
    if isMatch is false then continue
    # adjust the path and store any relevant pointcuts
    workingPath = if typeof(rule.path) is "string" then rule.path else rule.path(workingPath)
    if rule?.pointcuts?.before then pointcuts.before.push(rule.pointcuts.before)
    if rule?.pointcuts?.after then pointcuts.after.push(rule.pointcuts.after)
  
  # apply global rules for all paths
  if workingPath.indexOf("/") isnt 0
    if typeof(userConfig.moduleRoot) is "undefined" then throw new Error("Module Root must be defined")  
    else if typeof(userConfig.moduleRoot) is "string" then workingPath = "#{userConfig.moduleRoot}#{workingPath}"
    else if typeof(userConfig.moduleRoot) is "function" then workingPath = userConfig.moduleRoot(workingPath)
  if !jsSuffix.test(workingPath) then workingPath = "#{workingPath}.js"
  
  db.module.setPath(moduleId, workingPath)
  db.module.setPointcuts(moduleId, pointcuts)
  db.module.setRulesApplied(moduleId, true)

executeFile = (moduleId) ->
  ###
  ## executeFile(moduleId) ##
  _internal_ attempts to execute a file with a CommonJS scope
  and store the exports
  ###
  
  if db.module.getExports(moduleId) then return
  
  cuts = getFormattedPointcuts(moduleId)
  path = db.module.getPath(moduleId)
  text = db.module.getFile(moduleId)
  header = commonJSHeader.replace(/__MODULE_ID__/g, moduleId)
                         .replace(/__MODULE_URI__/g, path)
                         .replace(/__INJECT_NS__/g, namespace)
                         .replace(/__POINTCUT_BEFORE__/g, cuts.before)
  footer = commonJSFooter.replace(/__POINTCUT_AFTER__/g, cuts.after)
  runCmd = "#{header}\n#{text}\n#{footer}\n//@ sourceURL=#{path}"

  # todo: circular dependency resolution
  try
    exports = context.eval(runCmd)
  catch err
    throw err
  # save exports
  db.module.setExports(moduleId, exports)

sendToXhr = (moduleId, callback) ->
  ###
  ## sendToXhr(moduleId, callback) ##
  CLEANUPOK
  _internal_ request a module at path using xmlHttpRequest. On retrieval, fire off cb
  ###
  path = db.module.getPath(moduleId)
  xhr = getXHR()
  xhr.open("GET", path)
  xhr.onreadystatechange = () ->
    if xhr.readyState == 4 and xhr.status == 200 then callback.call(context, moduleId, xhr.responseText)
  xhr.send(null)

sendToIframe = (moduleId, callback) ->
  ###
  ## sendToIframe(txId, module, path, cb) ##
  CLEANUPOK
  _internal_ request a module at path using Porthole + iframe. On retrieval, the cb will be fired
  ###
  path = db.module.getPath(moduleId)
  xDomainRpc.postMessage("#{moduleId} #{path}")

getXHR = () ->
  ###
  ## getXHR() ##
  CLEANUPOK
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
  CLEANUPOK
  Return the value of a module. This is a synchronous call, meaning the module needs
  to have already been loaded. If you are unsure about the module's existence, you
  should be using require.ensure() instead. For modules beyond the first tier, their
  shallow dependencies are resolved and block, so there is no need for require.ensure()
  beyond the topmost level.
  ###
  mod = db.module.getExports(moduleId)
  if mod is false then throw new Error("#{moduleId} not loaded")
  return mod

require.ensure = (moduleList, callback) ->
  ###
  ## require.ensure(moduleList, callback) ##
  CLEANUPOK
  Ensure the modules in moduleList (array) are loaded, and then execute callback
  (function). Use this instead of require() when you need to load shallow dependencies
  first.
  ###
  # init the iframe if required
  if userConfig.xd.xhr? and !xDomainRpc and !pauseRequired
    createIframe()
    pauseRequired = true
  
  ensureExecutionCallback = () ->
    module = {}
    exports = {}
    module.exports = exports
    callback.call(context, require, module, exports)

  # our default behavior. Load everything
  # then, once everything says its loaded, call the callback
  run = () ->
    loadModules(moduleList, ensureExecutionCallback)
  if pauseRequired then db.queue.load.add(run)
  else run()

require.setModuleRoot = (root) ->
  ###
  ## require.setModuleRoot(root) ##
  CLEANUPOK
  set the base path for including your modules. This is used as the default if no
  items in the manifest can be located.
  
  Optionally, you can set root to a function. The return value of that function will
  be used instead. This can allow for very complex module configurations and branching
  with multiple CDNs such as in a complex production environment.
  ###
  if typeof(root) is "string" and root.lastIndexOf("/") isnt root.length then root = "#{root}/"
  userConfig.moduleRoot = root

require.setExpires = (expires) ->
  ###
  ## require.setExpires(expires) ##
  CLEANUPOK
  Set the time in seconds that files will persist in localStorage. Setting to 0 will disable
  localstorage caching.
  ###
  userConfig.fileExpires = expires

require.setCrossDomain = (local, remote) ->
  ###
  ## require.setCrossDomain(local, remote) ##
  CLEANUPOK
  Set a pair of URLs to relay files. You must have two relay files in your cross domain setup:
  
  * one relay file (local) on the same domain as the page hosting Inject
  * one relay file (remote) on the domain where you are hosting your root from setModuleRoot()
  
  The same require.setCrossDomain statement should be added to BOTH your relay.html files.
  ###
  userConfig.xd.inject = local
  userConfig.xd.xhr = remote

require.clearCache = (version) ->
  ###
  ## require.clearCache(version) ##
  CLEANUPOK
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
  for own item, rules of manifest
    ruleSet =
      path: rules.path or null
      pointcuts:
        before: rules.before or null
        after: rules.after or null
    require.addRule(item, ruleSet)

require.addRule = (match, weight = null, ruleSet = null) ->
  ###
  TODO DOC
  ###
  if ruleSet is null
    # weight (optional) omitted
    ruleSet = weight
    weight = db.queue.rules.size()
  if typeof(ruleSet) is "string"
    usePath = ruleSet
    ruleSet =
      path: usePath
  db.queue.rules.add({
    key: match
    weight: weight
    pointcuts: ruleSet.pointcuts or null
    path: ruleSet.path or null
  })

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

  # This module has no dependencies
  if Object.prototype.toString.call(deps) isnt "[object Array]"
    callback = deps
    deps = []

  # Strip out 'require', 'exports', 'module' in deps array for require.ensure
  strippedDeps = []
  for dep in deps
    if dep isnt "exports" and dep isnt "require" and dep isnt "module" then strippedDeps.push(dep)

  db.module.setStaticRequires(moduleId, strippedDeps)
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
    if moduleId then db.module.setExports(moduleId, exports);
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
  debug: () ->
    console?.dir(_db)
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