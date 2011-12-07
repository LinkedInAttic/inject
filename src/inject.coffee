###
# Inject: Dependency Awesomeness #

Some sample ways to use inject...
    var foo = require("moduleName");

    // -- or --

    require.ensure(["moduleOne", "moduleTwo", "moduleThree"], function(require, exports, module) {
      var foo = require("moduleOne");
    })

    // -- or --

    require.run("mySampleApplication")

Configuring Inject
  require.setModuleRoot("http://example.com/path/to/js/root")
  require.setCrossDomain("http://local.example.com/path/to/relay.html", "http://remote.example.com/path/to/relay.html")
  require.addRule(moduleName, "http://local.example.com/path/to/module")

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
userConfig = {}                     # user configuration options (see reset)
undef = undef                       # undefined
schemaVersion = 1                   # version of inject()'s localstorage schema
context = this                      # context is our local scope. Should be "window"
pauseRequired = false               # can we run immediately? when using iframe transport, the answer is no
_db = {}                            # internal database of modules and transactions (see reset)
xDomainRpc = null                   # a cross domain RPC object (Porthole)
fileStorageToken = "FILEDB"         # a storagetoken identifier we use (lscache)
fileStore = "Inject FileStorage"    # file store to use
namespace = "Inject"                # the namespace for inject() that is publicly reachable
userModules = {}                    # any mappings for module => handling defined by the user
jsSuffix = /.*?\.js$/               # Regex for identifying things that end in *.js
hostPrefixRegex = /^https?:\/\//    # prefixes for URLs that begin with http/https
hostSuffixRegex = /^(.*?)(\/.*|$)/  # suffix for URLs used to capture everything up to / or the end of the string
iframeName = "injectProxy"          # the name for the iframe proxy created (Porthole)
responseSlicer = ///                # a regular expression for slicing a response from iframe communication into its parts
  ^(.+?)[\s]+                         # (1) Anything up to a space (status code)
  ([\w\W]+?)[\s]+                     # (2) Anything up to a space (moduleid)
  ([\w\W]+)$                          # (3) Any text up until the end of the string (file)
  ///m                                # Supports multiline expressions
requireRegex = null
requireEnsureRegex = null
`
// requireRegexes from Yabble - James Brantly
requireRegex = /(?:^|[^\w\$_.])require\s*\(\s*("[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*')\s*\)/g;
// requireEnsureRegex = /(?:^|[^\w\$_.])require.ensure\s*\(\s*(\[("[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*'|\s*|,)*\])/g;
`
###
CommonJS wrappers for a header and footer
these bookend the included code and insulate the scope so that it doesn't impact inject()
or anything else.
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

db = {
  ###
  ## db{} ##
  this is the database for all registries and queues
  to reduce maintenance headaches, all accessing is done through this
  object, and not the _db object
  ###
  "module":
    ###
    ## db.module{} ##
    These functions manipulate the module registry
    ###
    "create": (moduleId) ->
      ###
      ## create(moduleId) ##
      create a registry entry for tracking a module
      ###
      registry = _db.moduleRegistry
      if !registry[moduleId]
        registry[moduleId] =
          "failed": false
          "exports": null
          "path": null
          "file": null
          "amd": false
          "loading": false
          "rulesApplied": false
          "requires": []
          "staticRequires": []
          "exec": null
          "pointcuts":
            "before": []
            "after": []
    "getExports": (moduleId) ->
      ###
      ## getExports(moduleId) ##
      get the exports for a given moduleId
      ###
      registry = _db.moduleRegistry
      
      # if failed, return false outright
      if db.module.getFailed(moduleId) then return false
      
      if registry[moduleId]?.exports then return registry[moduleId].exports
      if registry[moduleId]?.exec
        registry[moduleId].exec()
        registry[moduleId].exec = null
        return registry[moduleId].exports
      return false
    "setExports": (moduleId, exports) ->
      ###
      ## setExports(moduleId, exports) ##
      set the exports for moduleId
      ###
      registry = _db.moduleRegistry
      db.module.create(moduleId)
      registry[moduleId].exports = exports
    "getPointcuts": (moduleId) ->
      ###
      ## getPointcuts(moduleId) ##
      get the pointcuts for a given moduleId
      ###
      registry = _db.moduleRegistry
      if registry[moduleId]?.pointcuts then return registry[moduleId].pointcuts
    "setPointcuts": (moduleId, pointcuts) ->
      ###
      ## setPointcuts(moduleId, pointcuts) ##
      set the pointcuts for moduleId
      ###
      registry = _db.moduleRegistry
      db.module.create(moduleId)
      registry[moduleId].pointcuts = pointcuts
    "getRequires": (moduleId) ->
      ###
      ## getRequires(moduleId) ##
      get the requires for a given moduleId found at runtime
      ###
      registry = _db.moduleRegistry
      if registry[moduleId]?.requires then return registry[moduleId].requires
    "setRequires": (moduleId, requires) ->
      ###
      ## setRequires(moduleId, requires) ##
      set the runtime dependencies for moduleId
      ###
      registry = _db.moduleRegistry
      db.module.create(moduleId)
      registry[moduleId].requires = requires
    "getStaticRequires": (moduleId) ->
      ###
      ## getStaticRequires(moduleId) ##
      get the requires for a given moduleId found at declaration time (static dependencies)
      ###
      registry = _db.moduleRegistry
      if registry[moduleId]?.staticRequires then return registry[moduleId].staticRequires
    "setStaticRequires": (moduleId, staticRequires) ->
      ###
      ## setStaticRequires(moduleId, staticRequires) ##
      set the staticRequires for moduleId, found at declaration time
      ###
      registry = _db.moduleRegistry
      db.module.create(moduleId)
      registry[moduleId].staticRequires = staticRequires
    "getRulesApplied": (moduleId) ->
      ###
      ## getRulesApplied(moduleId) ##
      get the status of the rulesApplied flag. It's set when it has passed through
      the rules queue
      ###
      registry = _db.moduleRegistry
      if registry[moduleId]?.rulesApplied then return registry[moduleId].rulesApplied else return false
    "setRulesApplied": (moduleId, rulesApplied) ->
      ###
      ## setRulesApplied(moduleId, rulesApplied) ##
      set the rules applied flag for moduleId once all rules have been applied
      ###
      registry = _db.moduleRegistry
      db.module.create(moduleId)
      registry[moduleId].rulesApplied = rulesApplied
    "getPath": (moduleId) ->
      ###
      ## getPath(moduleId) ##
      get the resolved path for a given moduleId
      ###
      registry = _db.moduleRegistry
      if registry[moduleId]?.path then return registry[moduleId].path else return false
    "setPath": (moduleId, path) ->
      ###
      ## setPath(moduleId, path) ##
      set the path for moduleId
      ###
      registry = _db.moduleRegistry
      db.module.create(moduleId)
      registry[moduleId].path = path
    "getFile": (moduleId) ->
      ###
      ## getFile(moduleId) ##
      get the file for a given moduleId. If it doesn't exist in the registry,
      look for the object in localStorage. Return false if no matches are found
      ###
      registry = _db.moduleRegistry
      path = db.module.getPath(moduleId)
      token = "#{fileStorageToken}#{schemaVersion}#{path}"
      if registry[moduleId]?.file then return registry[moduleId].file

      if userConfig.fileExpires is 0 then return false

      file = lscache.get(token)
      if file and typeof(file) is "string" and file.length
        db.module.setFile(moduleId, file)
        return file
      return false
    "setFile": (moduleId, file) ->
      ###
      ## setFile(moduleId, file) ##
      set the file contents for moduleId, and update localStorage
      ###
      registry = _db.moduleRegistry
      db.module.create(moduleId)
      registry[moduleId].file = file
      path = db.module.getPath(moduleId)
      token = "#{fileStorageToken}#{schemaVersion}#{path}"
      lscache.set(token, file, userConfig.fileExpires)
    "clearAllFiles": () ->
      ###
      ## clearAllFiles() ##
      remove all files from the registry. It sets them all back to an unloaded state
      ###
      registry = _db.moduleRegistry
      for own moduleId, data of registry
        data.file = null
        data.loading = false
    "getFailed": (moduleId) ->
      ###
      ## getFailed(moduleId) ##
      get the status of the failed flag. It's set when a module fails to load
      ###
      registry = _db.moduleRegistry
      if registry[moduleId]?.failed then return registry[moduleId].failed else return false
    "setFailed": (moduleId, failed) ->
      ###
      ## setFailed(moduleId, failed) ##
      get the status of the failed flag. It's set when a module fails to load
      ###
      registry = _db.moduleRegistry
      db.module.create(moduleId)
      registry[moduleId].failed = failed
    "getAmd": (moduleId) ->
      ###
      ## getAmd(moduleId) ##
      get the status of the amd flag. It's set when a module is defined use AMD
      ###
      registry = _db.moduleRegistry
      if registry[moduleId]?.amd then return registry[moduleId].amd else return false
    "setAmd": (moduleId, isAmd) ->
      ###
      ## setAmd(moduleId, isAmd) ##
      set the amd flag for moduleId, It's set when a module is defined use AMD
      ###
      registry = _db.moduleRegistry
      db.module.create(moduleId)
      registry[moduleId].amd = isAmd
    "getLoading": (moduleId) ->
      ###
      ## getLoading(moduleId) ##
      get the status of the loading flag. It's set when an item begins download,
      and cleared when the download completes and the file is saved
      ###
      registry = _db.moduleRegistry
      if registry[moduleId]?.loading then return registry[moduleId].loading else return false
    "setLoading": (moduleId, loading) ->
      ###
      ## setLoading(moduleId, loading) ##
      set the loading flag for moduleId, It's set when an item begins download
      ###
      registry = _db.moduleRegistry
      db.module.create(moduleId)
      registry[moduleId].loading = loading
  "txn":
    ###
    ## db.txn{} ##
    These methods manipulate the transaction registry
    ###
    "create": () ->
      ###
      ## create() ##
      Create a transaction so we can count outstanding requests
      ###
      id = _db.transactionRegistryCounter++
      _db.transactionRegistry[id] = 0
      return id
    "add": (txnId) ->
      ###
      ## add(txnId) ##
      increment the counter for a given transaction id
      ###
      _db.transactionRegistry[txnId]++
    "subtract": (txnId) ->
      ###
      ## subtract(txnId) ##
      decrement the counter for a given transaction id
      ###
      _db.transactionRegistry[txnId]--
    "get": (txnId) ->
      ###
      ## get(txnId) ##
      Get the number of outstanding transactions for a given transaction id
      ###
      return _db.transactionRegistry[txnId]
    "remove": (txnId) ->
      ###
      ## remove(txnId) ##
      Remove a transaction entry from the registry
      ###
      _db.transactionRegistry[txnId] = null
      delete _db.transactionRegistry[txnId]
  "queue":
    "load":
      ###
      ## db.queue.load{} ##
      these methods affect the load queue, tracking callback requests
      when loading is blocked for a cross domain iframe
      ###
      "add": (item) ->
        _db.loadQueue.push(item)
      "get": () ->
        return _db.loadQueue
      "clear": () ->
        _db.loadQueue = []
    "rules":
      ###
      ## db.queue.rules{} ##
      these methods affect the rules queue, tracking rules placed into
      the system via addRule(). Any time the rules are dirty, we sort them
      on get()
      ###
      "add": (item) ->
        _db.rulesQueue.push(item)
        _db.rulesQueueDirty = true
      "get": () ->
        if _db.rulesQueueDirty
          _db.rulesQueueDirty = false
          _db.rulesQueue.sort (a, b) ->
            return b.weight - a.weight
        return _db.rulesQueue
      "size": () ->
        return _db.rulesQueue.length
    "file":
      ###
      ## db.queue.file{} ##
      these methods affect the file queue, used for tracking pending callbacks
      when a file is being downloaded. It supports a clear() method to remove
      all pending callbacks after the queue has been ran.
      ###
      "add": (moduleId, item) ->
        if !_db.fileQueue[moduleId] then !_db.fileQueue[moduleId] = []
        _db.fileQueue[moduleId].push(item)
      "get": (moduleId) ->
        if _db.fileQueue[moduleId] then return _db.fileQueue[moduleId] else return []
      "clear": (moduleId) ->
        if _db.fileQueue[moduleId] then _db.fileQueue[moduleId] = []
    "amd":
      ###
      ## db.queue.amd{} ##
      these methods affect the amd queue, used for tracking pending amd callbacks
      when a defined module file is being downloaded. It supports a clear() method to remove
      all pending callbacks after the queue has been ran.
      ###
      "add": (moduleId, item) ->
        if !_db.amdQueue[moduleId] then !_db.amdQueue[moduleId] = []
        _db.amdQueue[moduleId].push(item)
      "get": (moduleId) ->
        if _db.amdQueue[moduleId] then return _db.amdQueue[moduleId] else return []
      "clear": (moduleId) ->
        if _db.amdQueue[moduleId] then _db.amdQueue[moduleId] = []
}

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

reset = () ->
  _db =                               # internal database of modules and transactions
    "moduleRegistry": {}              # a registry of modules that have been loaded
    "transactionRegistry": {}         # a registry of transaction ids and what modules were associated
    "transactionRegistryCounter": 0   # a unique id for transactionRegistry
    "loadQueue": []                   # a queue used when performing iframe based cross domain loads
    "rulesQueue": []                  # the collection of rules for processing
    "fileQueue": []                   # a list of callbacks waiting on a file download
    "amdQueue": []                    # a list of callbacks waiting on a defined module file download and execute
  userConfig =
    "moduleRoot": null                # the module root location
    "fileExpires": 1440               # the default expiry for items in lscache (in minutes)
    "xd":
      "inject": null                  # the location of the relay.html file, same domain as inject
      "xhr": null                     # the location of the relay.html file, same domain as moduleRoot
reset()


clearFileRegistry = (version = schemaVersion) ->
  ###
  ## clearFileRegistry(version = schemaVersion) ##
  _internal_ Clears the internal file registry at `version`
  clearing all local storage keys that relate to the fileStorageToken and version
  ###
  token = "#{fileStorageToken}#{version}"
  keys = []
  `
  for (var i = 0; i < localStorage.length; i++) {
    var key = localStorage.key(i);
    if (key.indexOf(token) !== -1) keys.push(key)
  }
  `
  for key in keys
    localStorage.removeItem(key)
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
      queue = db.queue.load.get()
      db.queue.load.clear()
      item() for item in queue
      return
    else
      pieces = event.data.match(responseSlicer)
      processCallbacks(pieces[1], pieces[2], pieces[3])

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
    'before': noop
    'after': noop
  if !userModules[module] then return pointcuts
  definition = userModules[module]

  for cut, fn of pointcuts
    if definition[cut] then pointcuts[cut] = definition[cut]

  return pointcuts

dispatchTreeDownload = (id, tree, node, callback) ->
  ###
  ## dispatchTreeDownload(id, tree, node, callback) ##
  _internal_ this is used to decouple the execution of a subtree when in a loop
  It uses setTimeout() to fully decouple the item, and yield to the page which
  may be doing other tasks. When all children have completed, callback() is
  invoked
  ###
  tree.addChild(node)
  db.txn.add(id)
  afterDownload = () ->
    db.txn.subtract(id)
    if db.txn.get(id) is 0
      db.txn.remove(id)
      moduleId = node.getValue()
      if db.module.getAmd(moduleId) is true and db.module.getExports(moduleId) is false
        db.queue.amd.add(moduleId,callback);
      else
        callback()

  if db.module.getLoading(node.getValue()) is false
    context.setTimeout( () ->
      downloadTree(node, afterDownload)
    ) 
  else
    # module is loading. add a callback to reduce counter by 1
    # instead of invoking a downloadTree() call
    db.queue.file.add(node.getValue(), afterDownload)

loadModules = (modList, callback) ->
  ###
  ## loadModules(modList, callback) ##
  _internal_ load a collection of modules in modList, and once they have all loaded, execute the callback cb
  ###

  # shortcut. If modList is undefined, then call the callback
  if modList.length is 0
    context.setTimeout(
      () -> callback.apply(context, [])
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
  ###
  ## downloadTree(tree, callback) ##
  download the current item and its dependencies, storing the results in a tree
  when all items have finished loading, invoke callback()
  ###
  moduleId = tree.getValue()

  # apply the ruleset for this module if we haven't yet
  applyRules(moduleId) if db.module.getRulesApplied() is false

  # the callback every module has when it has been loaded
  onDownloadComplete = (moduleId, file) ->
    db.module.setFile(moduleId, file)

    if file
      analyzeFile(moduleId)
      requires = db.module.getRequires(moduleId)
    else
      requires = []
    
    id = db.txn.create()
    for req in requires
      node = new treeNode(req)
      dispatchTreeDownload(id, tree, node, callback)
    if db.txn.get(id) is 0
      db.txn.remove(id)
      if db.module.getAmd(moduleId) is true and db.module.getExports(moduleId) is false
        db.queue.amd.add(moduleId,() -> context.setTimeout(callback));
      else
        context.setTimeout(callback)
  # download a file over xhr or cross domain
  download = () ->
    db.module.setLoading(moduleId, true)
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
  if file and file.length > 0 then processCallbacks(200, moduleId, file) else download()

processCallbacks = (status, moduleId, file) ->
  ###
  ## processCallbacks(moduleId, file) ##
  _internal_ given a module ID and file, disable the loading flag for the module
  then locate all callbacks that have been queued- dispatch them
  ###
  if 1*status isnt 200
    file = false
    db.module.setFailed(moduleId, true);
  
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
  require = (item) ->
    requires.push(item) if uniques[item] isnt true
    uniques[item] = true
  require.ensure = (items) ->
    require(item) for item in items

  # collect runtime requirements
  reqs = []
  file = db.module.getFile(moduleId)
  reqs.push(match[0]) while (match = requireRegex.exec(file))
  # reqs.push(match[0]) while (match = requireEnsureRegex.exec(file))
  if reqs?.length > 0 then eval(reqs.join(";"))

  # collect static requirements such as in define()
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
  
  # before going futher, execute all of its required modules
  # right now, we're leaving this as recursive
  for requiredModuleId in db.module.getRequires(moduleId)
    executeFile(requiredModuleId)
  for requiredModuleId in db.module.getStaticRequires(moduleId)
    executeFile(requiredModuleId)

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
    if xhr.readyState is 4 then return callback.call(context, xhr.status, moduleId, xhr.responseText)
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
  ## require.addRule(match, [weight], ruleset) ##
  Add a rule that matches the given match, and apply ruleset to it
  * match: a regex or string to match against
  * weight: [optional] a numeric weight. Higher numbered weights run later
  * ruleset: a string containing a 1:1 replacement for match, or an object literal that
    contains path or pointcuts information
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
  ## require.run(moduleId) ##
  Try to getFile for moduleId, if the file exists, execute the file, if not, load this file and run it
  ###
  if db.module.getFile(moduleId) is false
    require.ensure([moduleId], () ->)
  else
    db.module.setExports(moduleId, null)
    executeFile(moduleId);

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
  if moduleId then db.module.setAmd(moduleId, true)

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
      count++ for own item in module['exports']
      exports = returnValue if count is 0 and typeof(returnValue) isnt "undefined"
    else if typeof(callback) is 'object'
      exports = callback

    # save moduleId, exports into module list
    # we only save modules with an ID
    if moduleId
      db.module.setExports(moduleId, exports)
      amdCallbackQueue = db.queue.amd.get(moduleId)
      for amdCallback in amdCallbackQueue
        amdCallback()
      db.queue.amd.clear(moduleId)
  )


# To allow a clear indicator that a global define function conforms to the AMD API
define['amd'] =
  'jQuery': true # jQuery requires explicitly defining inside of define.amd

# set context.require to the main inject object
# set context.define to the main inject object
# set an alternate interface in Inject in case things get clobbered
context['require'] = require
context['define'] = define
context['Inject'] = {
  'require': require,
  'define': define,
  'reset': reset,
  'debug': () ->
    console?.dir(_db)
}
context['require']['ensure'] = require.ensure;
context['require']['setModuleRoot'] = require.setModuleRoot;
context['require']['setExpires'] = require.setExpires;
context['require']['setCrossDomain'] = require.setCrossDomain;
context['require']['clearCache'] = require.clearCache;
context['require']['manifest'] = require.manifest;
context['require']['run'] = require.run;
