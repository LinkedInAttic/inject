###
Inject
Copyright 2011 LinkedIn

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing,
software distributed under the License is distributed on an "AS
IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
express or implied.   See the License for the specific language
governing permissions and limitations under the License.

--------------------

# Inject is Dependency Awesomeness #
Some sample ways to use inject...
  var foo = require("moduleName");
  // -- or --
  require.ensure(["moduleOne", "moduleTwo", "moduleThree"], function(require, exports, module) {
    var foo = require("moduleOne");
  })
  // -- or --
  require.run("mySampleApplication")

For more details, check out the github: https://github.com/Jakobo/inject
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
# Always run "cake build" and make sure it compiles. Test before you pull request.
#

###
Constants and Registries used
###
isIE = eval("/*@cc_on!@*/false")    # a test to determine if this is the IE engine (needed for source in eval commands)
docHead = null                      # document.head reference
onErrorOffset = 0                   # offset for onerror calls
funcCount = 0                       # functions initialized to date
userConfig = {}                     # user configuration options (see reset)
undef = undef                       # undefined
context = this                      # context is our local scope. Should be "window"
pauseRequired = false               # can we run immediately? when using iframe transport, the answer is no
_db = {}                            # internal database of modules and transactions (see reset)
xDomainRpc = null                   # a cross domain RPC object (Porthole)
fileStorageToken = "INJECT"         # a storagetoken identifier we use (lscache)
schemaVersion = 1                   # the version of data storage schema for lscache
schemaVersionString = "!version"    # the schema version string for validation of lscache schema
namespace = "Inject"                # the namespace for inject() that is publicly reachable
userModules = {}                    # any mappings for module => handling defined by the user
fileSuffix = /.*?\.(js|txt)(\?.*)?$/# Regex for identifying things that end in *.js or *.txt
hostPrefixRegex = /^https?:\/\//    # prefixes for URLs that begin with http/https
hostSuffixRegex = /^(.*?)(\/.*|$)/  # suffix for URLs used to capture everything up to / or the end of the string
iframeName = "injectProxy"          # the name for the iframe proxy created (Porthole)
responseSlicer = ///                # a regular expression for slicing a response from iframe communication into its parts
  ^(.+?)[\s]+                         # (1) Anything up to a space (status code)
  ([\w\W]+?)[\s]+                     # (2) Anything up to a space (moduleid)
  ([\w\W]+)$                          # (3) Any text up until the end of the string (file)
  ///m                                # Supports multiline expressions

###
Regexes to extract function identifiers, comments, require() statements, or requirements from a define() call
###
functionRegex = /^[\s\(]*function[^(]*\(([^)]*)\)/
functionNewlineRegex = /\/\/.*?[\r\n]|\/\*(?:.|[\r\n])*?\*\//g
functionSpaceRegex = /\s+/g
requireRegex = /(?:^|[^\w\$_.\(])require\s*\(\s*("[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*')\s*\)/g
defineStaticRequireRegex = /^[\r\n\s]*define\(\s*("\S+",|'\S+',|\s*)\s*\[([^\]]*)\],\s*(function\s*\(|{).+/
requireGreedyCapture = /require.*/
commentRegex = /(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/mg
relativePathRegex = /^(\.{1,2}\/).+/
absolutePathRegex = /^([A-Za-z]+:)?\/\//

###
lscache configuration
sets up lscache to operate within the local scope
###
lscache.setBucket(fileStorageToken)
lscacheSchemaVersion = lscache.get(schemaVersionString)

if lscacheSchemaVersion && lscacheSchemaVersion > 0 && lscacheSchemaVersion < schemaVersion
  lscache.flush()
  lscacheSchemaVersion = 0
if !lscacheSchemaVersion then lscache.set(schemaVersionString, schemaVersion)

###
CommonJS wrappers for a header and footer
these bookend the included code and insulate the scope so that it doesn't impact inject()
or anything else.
###
commonJSHeader = '''
__INJECT_NS__.execute.__FUNCTION_ID__ = function() {
  with (window) {
    var __module = __INJECT_NS__.createModule("__MODULE_ID__", "__MODULE_URI__"),
        __require = __INJECT_NS__.require,
        __exe = null;
    __INJECT_NS__.setModuleExports("__MODULE_ID__", __module.exports);
    __exe = function(require, module, exports) {
      __POINTCUT_BEFORE__
'''
commonJSFooter = '''
      __POINTCUT_AFTER__
    };
    __INJECT_NS__.defineAs(__module.id);
    try {
      __exe.call(__module, __require, __module, __module.exports);
    }
    catch (__EXCEPTION__) {
      __module.error = __EXCEPTION__;
    }
    __INJECT_NS__.undefineAs();
    return __module;
  }
};
'''

createEvalScript = (code) ->
  if !docHead then docHead = document.getElementsByTagName("head")[0]
  scr = document.createElement("script")
  # attempt to set its content for injection
  try
    scr.text = code
  catch innerTextException
    try
      scr.innerHTML = code
    catch innerHTMLException
      return false
  return scr

###
Test the onError offset for debugging purposes
Addresses the needs in #105 and #112
###
testScript = '''
function Inject_Test_Known_Error() {
  function nil() {}
  nil("Known Syntax Error Line 3";
}
'''
testScriptNode = createEvalScript(testScript)
oldError = context.onerror
context.onerror = (err, where, line) ->
  onErrorOffset = 3 - line
  window.setTimeout () -> docHead.removeChild(testScriptNode)
  return true
docHead.appendChild(testScriptNode)
context.onerror = oldError


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
          "executed": false
          "rulesApplied": false
          "requires": []
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
      if registry[moduleId]?.file then return registry[moduleId].file

      if userConfig.fileExpires is 0 then return false

      file = lscache.get(path)
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
      lscache.set(path, file, userConfig.fileExpires)
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
    "getCircular": (moduleId) ->
      ###
      ## getFailed(moduleId) ##
      get the status of the circular flag. It's set when a module has a circular dependency
      ###
      registry = _db.moduleRegistry
      if registry[moduleId]?.circular then return registry[moduleId].circular else return false
    "setCircular": (moduleId, circular) ->
      ###
      ## setFailed(moduleId, failed) ##
      get the status of the circular flag. It's set when a module has a circular dependency
      ###
      registry = _db.moduleRegistry
      db.module.create(moduleId)
      registry[moduleId].circular = circular
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
    "getExecuted": (moduleId) ->
      ###
      ## getExecuted(moduleId) ##
      get the status of the executed flag. It's set when a module is evalled
      ###
      registry = _db.moduleRegistry
      if registry[moduleId]?.executed then return registry[moduleId].executed else return false
    "setExecuted": (moduleId, executed) ->
      ###
      ## setExecuted(moduleId, executed) ##
      set the executed flag for moduleId, It's set when an item is evaled
      ###
      registry = _db.moduleRegistry
      db.module.create(moduleId)
      registry[moduleId].executed = executed
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
    "define":
      "add": (moduleId) ->
        _db.defineQueue.unshift(moduleId)
      "remove": () ->
        _db.defineQueue.shift()
      "peek": () ->
        return _db.defineQueue[0]
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
    "defineQueue": []
  userConfig =
    "moduleRoot": null                # the module root location
    "fileExpires": 1440               # the default expiry for items in lscache (in minutes)
    "xd":
      "inject": null                  # the location of the relay.html file, same domain as inject
      "xhr": null                     # the location of the relay.html file, same domain as moduleRoot
    "debug":
      "sourceMap": false
reset()


clearFileRegistry = () ->
  ###
  ## clearFileRegistry() ##
  _internal_ Clears the internal file registry
  clearing all local storage keys that relate to the fileStorageToken
  ###
  
  if ! ('localStorage' in context) then return
  
  db.module.clearAllFiles()
  lscache.flush()

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
      if db.module.getAmd(moduleId) and db.module.getLoading(moduleId)
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
  outstandingAMDModules = 0
  execute = () ->
    amdComplete = () ->
      exports = []
      for moduleId in modList
        exports.push(db.module.getExports(moduleId))
      callback.apply(context, exports)

    executionOrder = tree.postOrder()
    for moduleId in executionOrder
      if moduleId is null then continue
      # check if moduleId is amd. if there's amd in the tree
      # add a callback to manage the count
      executeFile(moduleId)
      if db.module.getAmd(moduleId) and db.module.getLoading(moduleId)
        outstandingAMDModules++
        db.queue.amd.add moduleId, () ->
          if --outstandingAMDModules is 0 then amdComplete()
    if outstandingAMDModules is 0 then amdComplete()

  for moduleId in modList
    moduleId = standardizeModuleId(moduleId)
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
  if db.module.getRulesApplied() is false
    if relativePathRegex.test(moduleId)
      # handle relative path
      relativePath = userConfig.moduleRoot
      if tree.getParent() and tree.getParent().getValue()
        relativePath = db.module.getPath(tree.getParent().getValue())
      applyRules(moduleId, true, relativePath)
    else
      applyRules(moduleId, true)

  # the callback every module has when it has been loaded
  onDownloadComplete = (moduleId, file) ->
    db.module.setFile(moduleId, file)

    if file
      analyzeFile(moduleId, tree)
      requires = db.module.getRequires(moduleId)
    else
      requires = []

    processCallback = (id, cb) ->
      if db.module.getAmd(id) and db.module.getLoading(id)
        db.queue.amd.add(id,() -> context.setTimeout(cb));
      else
        context.setTimeout(cb)

    if requires.length > 0
      id = db.txn.create()
      for req in requires
        node = new treeNode(req)
        dispatchTreeDownload(id, tree, node, callback)
      if db.txn.get(id) is 0
        db.txn.remove(id)
        processCallback(moduleId, callback)
    else
      processCallback(moduleId, callback)

  # download a file over xhr or cross domain
  download = () ->
    db.module.setLoading(moduleId, true)
    if userConfig.xd.inject and userConfig.xd.xhr
      sendToIframe(moduleId, processCallbacks)
    else
      sendToXhr(moduleId, processCallbacks)

  # see if this module has already been loaded and processed
  if db.module.getExports(moduleId) then return callback()

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
  if db.module.getAmd(moduleId) is false
    db.module.setLoading(moduleId, false)
  cbs = db.queue.file.get(moduleId)
  db.queue.file.clear(moduleId)
  cb(moduleId, file) for cb in cbs

extractRequires = (file) ->
  requires = []
  uniques = {}
  require = (item) ->
    requires.push(item) if uniques[item] isnt true
    uniques[item] = true
  # collect runtime requirements
  reqs = []
  file = file.replace(commentRegex, "")

  # there are twp matches going on here. The while() captures the lines with require() in them
  # then, then a greedy capture ensures that we are starting with the "require" keyword and
  # don't have any extea whitespace
  reqs.push(match[0].match(requireGreedyCapture)[0]) while (match = requireRegex.exec(file))
  if reqs?.length > 0
    try
      eval(reqs.join(";"))
    catch err
      console?.log "Invalid require() syntax found in file: " + reqs.join(";")
      throw err

  # get static requirements
  staticReqs = []
  if defineStaticRequireRegex.exec(file)
    staticReqs = defineStaticRequireRegex.exec(file)[2].replace(/\s|"|'|require|exports|module/g,'').split(',');

  for staticReq in staticReqs
    requires.push(staticReq) if uniques[staticReq] isnt true and staticReq isnt ''
    uniques[staticReq] = true

  return requires

analyzeFile = (moduleId, tree) ->
  ###
  ## analyzeFile(moduleId) ##
  _internal_ scan a module's file for dependencies and record them
  ###
  reqs = extractRequires(db.module.getFile(moduleId))
  
  # #65 remove circular depenencies before handling requires
  unsafeRequires = {}
  safeRequires = []
  hasCircular = false
  parent = tree
  while parent = parent.getParent()
    if parent.getValue() then unsafeRequires[parent.getValue()] = true
  for req in reqs
    if unsafeRequires[req] isnt true
      safeRequires.push(req)
    else
      # flag BOTH as circular
      hasCircular = true
      db.module.setCircular(req, true)
  
  db.module.setRequires(moduleId, safeRequires)
  db.module.setCircular(moduleId, hasCircular)

applyRules = (moduleId, save, relativePath) ->
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
  # if the stack has yielded an http:// URL, stop mucking with it
  if !absolutePathRegex.test(workingPath)
    # does not begin with a /. This makes it relative
    if workingPath.indexOf("/") isnt 0
      if typeof(userConfig.moduleRoot) is "undefined" then throw new Error("Module Root must be defined")
      else if typeof(userConfig.moduleRoot) is "string" then workingPath = "#{userConfig.moduleRoot}#{workingPath}"
      else if typeof(userConfig.moduleRoot) is "function" then workingPath = userConfig.moduleRoot(workingPath)

    # if we have a relative path, resolve based on that
    if typeof(relativePath) is "string"
      workingPath = basedir(relativePath) + moduleId

  if !fileSuffix.test(workingPath) then workingPath = "#{workingPath}.js"

  if save is true
    db.module.setPath(moduleId, workingPath)
    db.module.setPointcuts(moduleId, pointcuts)
    db.module.setRulesApplied(moduleId, true)
  else if save is false
    return {
      path: workingPath,
      pointcuts: pointcuts
    };

anonDefineStack = []
executeFile = (moduleId) ->
  ###
  ## executeFile(moduleId) ##
  _internal_ attempts to execute a file with a CommonJS scope
  and store the exports
  ###

  if db.module.getExecuted(moduleId) then return
  db.module.setExecuted(moduleId, true)
  
  anonDefineStack.unshift(moduleId);
  
  # before going futher, execute all of its required modules
  # right now, we're leaving this as recursive
  for requiredModuleId in db.module.getRequires(moduleId)
    executeFile(requiredModuleId)

  cuts = getFormattedPointcuts(moduleId)
  path = db.module.getPath(moduleId)
  text = db.module.getFile(moduleId)
  functionId = "exec#{funcCount++}"
  header = commonJSHeader.replace(/__MODULE_ID__/g, moduleId)
                         .replace(/__MODULE_URI__/g, path)
                         .replace(/__FUNCTION_ID__/g, functionId)
                         .replace(/__INJECT_NS__/g, namespace)
                         .replace(/__POINTCUT_BEFORE__/g, cuts.before)
  footer = commonJSFooter.replace(/__INJECT_NS__/g, namespace)
                         .replace(/__POINTCUT_AFTER__/g, cuts.after)
  
  runHeader = header + "\n"
  runCmd = [runHeader, text, ";", footer].join("\n")

  module = evalModule({
    moduleId: moduleId
    cmd: runCmd
    url: path
    functionId: functionId
    preamble: header,
    originalCode: text
  })
  
  # save exports
  db.module.setExports(module.id, module.exports)

evalModule = (options) ->
  ###
  ## evalModule(moduleId, callback) ##
  _internal_ eval js module code, also try to get error line number from orignal file
  Webkit: we can use window.onerror() safely. Line - preamble gives us the correct line
  Firefox: we need to subtract inject.js up until the onerror call
  ###
  moduleId = options.moduleId
  code = options.cmd
  url = options.url 
  functionId = options.functionId
  preamble = options.preamble
  originalCode = options.originalCode

  oldError = context.onerror
  errorObject = null
  preambleLines = preamble.split(/\n/).length + 1
  newError = (err, where, line) ->
    actualErrorLine = onErrorOffset - preambleLines + line
    linesOfCode = code.split("\n").length
    originalLinesOfCode = originalCode.split("\n").length

    # unexpected end of input handling
    if line is linesOfCode then actualErrorLine = originalLinesOfCode
    
    message = "Parse error in #{moduleId} (#{url}) on line #{actualErrorLine}:\n  #{err}"
    errorObject = new Error(message)
    return true
  getLineNumberFromException = (e) ->
    # firefox
    if typeof e.lineNumber isnt "undefined" and e.lineNumber isnt null then return e.lineNumber
    # webkit
    if e.stack
      lines = e.stack.split("\n")
      phrases = lines[1].split(":")
      return parseInt(phrases[phrases.length - 2], 10)
    return 0

  context.onerror = newError
  
  scr = createEvalScript(code)
  if scr
    docHead.appendChild(scr)
    window.setTimeout () -> docHead.removeChild(scr)

  if !errorObject
    # at this point, the global function should be created
    # if there was a parse error, we got juicy details
    # execute the function, which will use onerror() again if we hit a
    # problem

    # select our execution engine (if advanced debugging is required)
    if (userConfig.debug.sourceMap)
      sourceString = if isIE then "" else "//@ sourceURL=#{url}"
      toExec = (["(",Inject.execute[functionId].toString(),")()"]).join("")
      toExec = ([toExec, sourceString]).join("\n")
      module = eval(toExec)
    else
      module = Inject.execute[functionId]()
    
    if module.error
      actualErrorLine = onErrorOffset - preambleLines + getLineNumberFromException(module.error)
      message = "Parse error in #{moduleId} (#{url}) on line #{actualErrorLine}:\n  #{module.error.message}"
      errorObject = new Error(message)

  # okay, clean up our mess
  context.onerror = oldError
  if Inject?.execute[functionId] then delete Inject.execute[functionId]

  # throw a proper error if we failed somewhere
  # get rid of all localstorage cache
  if errorObject
    require.clearCache();
    throw errorObject

  # yay, module!
  return module

sendToXhr = (moduleId, callback) ->
  ###
  ## sendToXhr(moduleId, callback) ##
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
  _internal_ request a module at path using Porthole + iframe. On retrieval, the cb will be fired
  ###
  path = db.module.getPath(moduleId)
  xDomainRpc.postMessage("#{moduleId} #{path}")

getFunctionArgs = (fn) ->
  names = fn.toString().match(functionRegex)[1]
    .replace(functionNewlineRegex, '')
    .replace(functionSpaceRegex, '').split(',');
  if names.length is 1 and !names[0] then return [] else return names;

###
function argumentNames(fn) {
  var names = fn.toString().match(/^[\s\(]*function[^(]*\(([^)]*)\)/)[1]
    .replace(/\/\/.*?[\r\n]|\/\*(?:.|[\r\n])*?\*\//g, '')
    .replace(/\s+/g, '').split(',');
  return names.length == 1 && !names[0] ? [] : names;
}
###

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

initializeExports = (moduleId) ->
  if db.module.getExports(moduleId) isnt false then return
  newExports = {
    __inject_circular__: true
  }
  db.module.setExports(moduleId, newExports)

createModule = (id, uri, exports) ->
  module = {}
  module["id"] = id || null
  module["uri"] = uri || null
  module["exports"] = exports || db.module.getExports(id) || {}
  module["error"] = null
  module["setExports"] = (xobj) ->
    for own name in module["exports"]
      throw new Error("cannot setExports when exports have already been set")
    module["exports"] = xobj
    return module["exports"]
  return module

basedir = (path) ->
  if path.lastIndexOf("/") isnt -1
    path = path.substring(0, path.lastIndexOf("/") + 1)
  return path

standardizeModuleId = (moduleId) ->
  for rule in db.queue.rules.get()
    if typeof(rule.path) is "string" and rule.path.replace(/.js$/i, '') == moduleId
      moduleId = rule.key
  return moduleId

stripBuiltIns = (modules) ->
  strippedModuleList = []
  for mId in modules
    if mId isnt "require" and mId isnt "exports" and mId isnt "module"
      strippedModuleList.push(mId)
  return strippedModuleList

###
Main Payloads: require, require.ensure, etc
###
require = (moduleId, callback = ->) ->
  ###
  ## require(moduleId, [callback]) ##
  Return the value of a module. This is a synchronous call, meaning the module needs
  to have already been loaded. If you are unsure about the module's existence, you
  should be using require.ensure() instead. For modules beyond the first tier, their
  shallow dependencies are resolved and block, so there is no need for require.ensure()
  beyond the topmost level.
  
  require() also supports an array + function syntax, which creates compliance with the
  AMD specification.
  ###
  if Object.prototype.toString.call(moduleId) is "[object Array]"
    # amd compliant require()
    strippedModuleList = stripBuiltIns(moduleId)
    require.ensure(strippedModuleList, (require, module, exports) ->
      args = []
      for mId in moduleId
        switch mId
          when "require" then args.push(require)
          when "exports" then args.push(exports)
          when "module" then args.push(module)
          else args.push(require(mId));
      callback.apply(context, args);
    )
    return

  moduleId = standardizeModuleId(moduleId)
  exports = db.module.getExports(moduleId)
  isCircular = db.module.getCircular(moduleId)
  
  if exports is false and isCircular is false then throw new Error("#{moduleId} not loaded")
  
  if isCircular is true
    initializeExports(moduleId)
    exports = db.module.getExports(moduleId)
  
  return exports
  
require.run = (moduleId) ->
  ###
  ## require.run(moduleId) ##
  Try to getFile for moduleId, if the file exists, execute the file, if not, load this file and run it
  ###
  moduleId = standardizeModuleId(moduleId)
  if db.module.getFile(moduleId) is false
    require.ensure([moduleId], () ->)
  else
    db.module.setExports(moduleId, null)
    executeFile(moduleId);

require.ensure = (moduleList, callback) ->
  ###
  ## require.ensure(moduleList, callback) ##
  Ensure the modules in moduleList (array) are loaded, and then execute callback
  (function). Use this instead of require() when you need to load shallow dependencies
  first.
  ###
  # Assert moduleList is an Array or throw an exception.
  if moduleList not instanceof Array
    throw new Error("moduleList is not an Array")

  # strip builtins from ensure...
  moduleList = stripBuiltIns(moduleList)

  # init the iframe if required
  if userConfig.xd.xhr? and !xDomainRpc and !pauseRequired
    createIframe()
    pauseRequired = true

  ensureExecutionCallback = () ->
    module = createModule();
    exports = module.exports;
    callback.call(context, Inject.require, module, exports)

  # our default behavior. Load everything
  # then, once everything says its loaded, call the callback
  run = () ->
    loadModules(moduleList, ensureExecutionCallback)
  if pauseRequired then db.queue.load.add(run)
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
  if typeof(root) is "string"
    if root.indexOf("/") is 0 then root = "#{location.protocol}//#{location.host}#{root}"
    else if root.indexOf(".") is 0 then root = "#{location.protocol}//#{location.host}/#{root}"
  userConfig.moduleRoot = root

require.setExpires = (expires) ->
  ###
  ## require.setExpires(expires) ##
  Set the time in seconds that files will persist in localStorage. Setting to 0 will disable
  localstorage caching.
  ###
  userConfig.fileExpires = expires

require.setCrossDomain = (local, remote) ->
  ###
  ## require.setCrossDomain(local, remote) ##
  Set a pair of URLs to relay files. You must have two relay files in your cross domain setup:

  * one relay file (local) on the same domain as the page hosting Inject
  * one relay file (remote) on the domain where you are hosting your root from setModuleRoot()

  The same require.setCrossDomain statement should be added to BOTH your relay.html files.
  ###
  userConfig.xd.inject = local
  userConfig.xd.xhr = remote

require.clearCache = () ->
  ###
  ## require.clearCache() ##
  Remove the localStorage class at version. If no version is specified, the entire cache is cleared.
  ###
  clearFileRegistry()

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
      path: rules.path or rules or null
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

require.toUrl = (moduleURL) ->
  applyRules(moduleURL, false).path;

define = (moduleId, deps, callback) ->
  # Allow for anonymous functions, adjust args appropriately
  if typeof(moduleId) isnt "string"
    callback = deps
    deps = moduleId
    moduleId = null || db.queue.define.peek()

  module = createModule(moduleId)

  # This module has no dependencies
  if Object.prototype.toString.call(deps) isnt "[object Array]"
    callback = deps
    deps = ["require", "exports", "module"]

  db.module.setAmd(moduleId, true)
  db.module.setLoading(moduleId, true)
  allDeps = db.module.getRequires(moduleId);

  # request all dependencies via loadModules with a callback. We do not care about order here
  afterLoadModules = () ->
    # run the callback if it is a function
    if typeof(callback) is "function"
      args = []
      for dep in deps
        switch dep
          when "require" then args.push(Inject.require)
          when "exports" then args.push(module.exports)
          when "module" then args.push(module)
          else args.push(require(dep))
      returnValue = callback.apply(context, args);
      exportsSet = false

      # if we set module.exports to a function, then module.exports is ok
      # otherwise, walk through module.exports and see if anything has been
      # set. This deals with #91, where module.exports = function() fails in
      # the AMD case, and we want parity between the systems
      if typeof module.exports is "function"
        exportsSet = true
      else
        for own item, value of module.exports
          exportsSet = true
          break
      if exportsSet is false
        # exports were not set, returnValue is likely the export
        module.setExports(returnValue)
    else
      # callback is an object
      module.setExports(callback)
    
    # ensureModule should now contain everything we need in order to save this module
    db.module.setExports(moduleId, module.exports)
    db.module.setExecuted(moduleId, true)
    db.module.setLoading(moduleId, false)
    amdCallbackQueue = db.queue.amd.get(moduleId)
    for amdCallback in amdCallbackQueue
      amdCallback()
    db.queue.amd.clear(moduleId)
    
  outstandingAMDModules = 0
  for depId in allDeps
    if db.module.getAmd(depId) and db.module.getLoading(depId)
      outstandingAMDModules++
      db.queue.amd.add depId, () -> 
        if --outstandingAMDModules is 0
          afterLoadModules()
  loadModules allDeps, afterLoadModules

# To allow a clear indicator that a global define function conforms to the AMD API
define['amd'] = {}

# set context.require to the main inject object
# set context.define to the main inject object
# set an alternate interface in Inject in case things get clobbered
context['require'] = require
context['define'] = define
context['Inject'] = {
  'defineAs': (moduleId) -> db.queue.define.add(moduleId),
  'undefineAs': () -> db.queue.define.remove(),
  'createModule': createModule,
  'setModuleExports': (moduleId, exports) -> db.module.setExports(moduleId, exports),
  'require': require,
  'define': define,
  'reset': reset,
  'execute': {},
  'enableDebug': (key, value = true) -> userConfig.debug[key] = value
}
context['require']['ensure'] = require.ensure;
context['require']['setModuleRoot'] = require.setModuleRoot;
context['require']['setExpires'] = require.setExpires;
context['require']['setCrossDomain'] = require.setCrossDomain;
context['require']['clearCache'] = require.clearCache;
context['require']['manifest'] = require.manifest;
context['require']['run'] = require.run;
