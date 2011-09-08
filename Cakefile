VERSION = "0.1.0"
PROJECT = "inject"

fs = require("fs")
exec = require("child_process").exec
path = require("path")
compiler = "java -jar ./build/gcc/compiler.jar --compilation_level SIMPLE_OPTIMIZATIONS"
compilerInputFile = "--js ./artifacts/#{PROJECT}-#{VERSION}.js"
compilerOutputFile = "--js_output_file ./artifacts/#{PROJECT}-#{VERSION}.min.js"

packages = 
  min:
    name: "#{PROJECT}-#{VERSION}.min.js"
    headers: [ "./src/copyright-lic-min.js" ]
    files: [
      "./src/inject.coffee"
    ]
    copy: [ "./src/relay{VERSION}.html" ]
  full:
    uncompressed: true
    name: "#{PROJECT}-#{VERSION}.js"
    headers: [
      "./src/copyright.js"
      "./src/licenses.js"
    ]
    files: [
      "./src/inject.coffee"
    ]
    copy: [ "./src/relay{VERSION}.html" ]

fileSources = {}
tmpdir = "./tmp"
artifacts = "./artifacts"

task "build", "Build the Project", ->
  readSrc = (file, cb) ->
    if file.indexOf(".coffee") == -1
      # read file into slot
      console.log "Reading #{file}"
      fs.readFile "#{file}", "utf8", (err, contents) ->
        if err then return cb(err, null)
        cb(null, contents)
  
  compile = (file, cb) ->
    exec "coffee --output #{tmpdir} --compile #{file}", (err, stdout, stderr) ->
      if err then return cb(err, null)
      jsName = path.basename(file.replace(/\.coffee$/, ".js"))
      readSrc "#{tmpdir}/#{jsName}", (err, JScontents) ->
        if err then return cb(err, null)
        compress "#{tmpdir}/#{jsName}", (err, GCCcontents) ->
          if err then return cb(err, null)
          cb(null, [JScontents, GCCcontents])
  
  compress = (file, cb) ->
    if file.indexOf(tmpdir) isnt 0
      err = new Error("Can only compress items in tempdir")
      return cb(err, null)
    
    exec "java -jar ./build/gcc/compiler.jar --compilation_level SIMPLE_OPTIMIZATIONS --js #{file} --js_output_file #{file}.gcc", (err, stdout, stderr) ->
      if err then return cb(err, null)
      gccName = path.basename("#{file}.gcc")
      readSrc "#{tmpdir}/#{gccName}", (err, contents) ->
        if err then return cb(err, null)
        cb(null, contents)
  
  copy = (from, to, cb) ->
    srcFile = fs.createReadStream("#{from}");
    outFile = fs.createWriteStream("#{to}");
    srcFile.once "open", () ->
      require("util").pump srcFile, outFile, () ->
        cb(null, null)
  
  namespace = (file) ->
    file = file.replace(/[^a-zA-Z0-9\.\_\-]/g, "_")
  
  readInAllFiles = (allFiles, cb) ->
    remaining = allFiles.length
    
    innerCompile = (file) ->
      # this is a coffeescript file
      compile file, (err, contents) ->
        if err then return cb(err, null)
        fileSources[namespace(file)] = contents[1]
        fileSources["!"+namespace(file)] = contents[0]
        cb() if --remaining is 0
    
    innerRead = (file) ->
      # regular JS file
      readSrc file, (err, contents) ->
        if err then return cb(err, null)
        fileSources[namespace(file)] = contents
        cb() if --remaining is 0
    
    for file in allFiles
      if file.indexOf(".coffee") isnt -1
        innerCompile(file)
      if file.indexOf(".js") isnt -1
        innerRead(file)
  
  assemble = (pkg, cb) ->
    contents = []
    copies = pkg.copy.length
    useUncompressed = pkg.uncompressed is true
    for name in pkg.headers
      content = if useUncompressed and fileSources["!"+namespace(name)] then fileSources["!"+namespace(name)] else fileSources[namespace(name)]
      contents.push content
    for name in pkg.files
      content = if useUncompressed and fileSources["!"+namespace(name)] then fileSources["!"+namespace(name)] else fileSources[namespace(name)]
      contents.push content
    fs.writeFile "#{artifacts}/#{pkg.name}", contents.join("\n\n"), (err) ->
      if err then return cb(err, null)
      for item in pkg.copy
        fromItem = item.replace(/\{VERSION\}/, "")
        toItem = item.replace(/\{VERSION\}/, "#{VERSION}")
        copy fromItem, "#{artifacts}/#{toItem}", (err) ->
          if err then return cb(err, null)
          cb(null, null) if --copies is 0
  
  cleanup = (cb) ->
    exec "rm -rf #{tmpdir}", (err, stdout, stderr) ->
      if err then return cb(err, null)
      cb(null, null)
  
  complete = () ->
    console.log "Done!"
  
  # main
  files = []
  fileCache = {}
  pkgCount = 0
  for pkg, contents of packages
    pkgCount++
    for file in contents.files
      if !fileCache[file]
        files.push(file)
        fileCache[file] = true
    for file in contents.headers
      if !fileCache[file]
        files.push(file)
        fileCache[file] = true
  
  readInAllFiles files, (err) ->
    throw err if err
    for pkg, contents of packages
      assemble contents, (err) ->
        throw err if err
        if --pkgCount is 0
          cleanup () ->
            throw err if err
            complete()
