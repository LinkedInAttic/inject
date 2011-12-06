VERSION = "0.2.0"
PROJECT = "inject"

path = require("path")
fs= require("fs")
exec = require("child_process").exec

option '', '--project-name [NAME]', 'Used in default config to specify final output for raw and min "targets". Defaults to: "inject".'
option '', '--project-version [VERSION]', 'Used in default config to add version folders to "out" directory. Defaults to an empty string.'
option '', '--temporary-directory [DIR]', 'Where to save temporary files. Gets deleted after build. Defaults to: "./tmp/".'
option '', '--output-directory [DIR]', 'Where to save compressed/compiled files. Defaults to: "./artifacts/".'
option '', '--with-ie',      'Add IE 6/7 support. Adds a localStorage and JSON shim. Both are required for lscache. Defaults to false.'
option '', '--without-xd',   'Remove Porthole. Porthole is only used when requiring files cross-domain. Defaults to false.'
option '', '--without-json', 'Force JSON support to be dropped. Defaults to false.'
option '', '--compilation-level [LEVEL]', 'Level to compile output js to. If WHITESPACE_ONLY is selected then pretty formatting is used. Defaults to SIMPLE_OPTIMIZATIONS.'
task "build", "Builds inject library", (options)->

  PROJECT = options['project-name'] or 'inject'
  VERSION = options['project-version'] or ''
  supportIE = !!options['with-ie']
  supportJSON = supportIE and !!options['without-json']
  supportXD = !options['without-xd']
  compilationLevel = options['compilation-level'] or 'SIMPLE_OPTIMIZATIONS'

  config = {
    src: 'src/'
    tmp: options['temporary-directory'] or 'tmp/'
    out: options['output-directory'] or "artifacts/#{VERSION}/"
    modules : {
      'header': {
        files: ['copyright.js','licenses.js']
      }
      'ieCompat':{
        enabled: supportIE
        files:['localstorage-shim.js','json.js']
      }
      'crossDomain':{
        enabled:supportXD
        files:['relay.html','porthole.js']
      }
      'inject':{
        files:['inject.coffee']
        modules: ['crossDomain']
      }
      'main' :{
        compilationLevel:'WHITESPACE_ONLY'
        formatting:'pretty_print'
        modules:['header','ieCompat','inject']
      }
      'min':{
        compilationLevel: compilationLevel
        modules:['main']
      }
    }
    outMappings: {
      ieCompat: "ie-localstorage-json-shim.js"
      main:     "#{PROJECT}.js"
      min:      "#{PROJECT}.min.js"
    }
  }

  compileCoffeescript = (file = '', toDir = '', cb = ->) ->
    console.log "Compiling coffeescript #{file} => #{toDir}"
    name = (file.match(/\/([^\/]+)\.coffee$/i)||[]).pop()
    exec "coffee --bare --output #{toDir} --compile #{file}", (err, stdout, stderr) ->
      throw err if err
      cb toDir + name + '.js'

  copy = (from = '', toDir = '', cb = ->) ->
    console.log "Copy #{from} => #{toDir}"
    if from and toDir
      srcFile = fs.createReadStream("#{from}");
      outFile = fs.createWriteStream("#{toDir}");
      srcFile.once "open", () ->
        require("util").pump srcFile, outFile, () ->
          cb null
    else cb from

  processConfig = (cb = ->) ->

    loopCount = 0
    totalFiles = 0
    for name, mod of config.modules
      if mod.enabled isnt false
        totalFiles += (mod.files or []).length

    updateFileReference = (ref, i, file) ->
      # if file was modified above, update the reference
      if file
        ref[i] = file
      # if file is null, remove the reference
      else
        ref.splice(i,1)

      if ++loopCount is totalFiles
        cb()


    #loop through all files and compile or copy
    for moduleName, mod of config.modules
      if mod.files and mod.enabled isnt false
        # must loop backwards since we're modifying the array
        for i in [mod.files.length - 1..0] by -1

          # prefix with the path to the tmp folder and make sure it's a real path
          file = path.normalize config.src + mod.files[i]

          # if it's coffeescript then compile and update reference to the file
          if /\.coffee$/.test(file)
            compileCoffeescript file, config.tmp, updateFileReference.bind null, mod.files, i

          # if it's anything but js, just copy it and remove the reference to this file
          else if !/\.js$/.test(file)
            copy file, config.out, updateFileReference.bind null, mod.files, i

          # else, update the reference anyways
          else
            updateFileReference mod.files, i, file

  createClosureModules = (cb = ->) ->
    compilerModules = []
    for moduleName, mod of config.modules
      files = mod.files or []
      deps = mod.modules or []
      length = if mod.enabled isnt false then files.length else 0
      str = [moduleName,length].join(':')
      if deps and deps.length > 0
        str += ':' + deps.join(',')
      if files.length > 0 and mod.enabled isnt false
        str += ' --js ' + files.join(' --js ')
      compilerModules.push(str)
    cb('--module ' + compilerModules.join(' --module '))

  execClosureCompiler = (moduleStr, cb = ->) ->
    moduleDir = path.normalize("#{config.tmp}/modules/")
    formatting = if compilationLevel is 'WHITESPACE_ONLY' then '--formatting pretty_print' else ''
    console.log "java -jar ./build/gcc/compiler.jar #{formatting} --module_wrapper 'main:(function() {%s}.call(this)' --module_output_path_prefix #{moduleDir} --compilation_level #{compilationLevel} #{moduleStr}"
    exec "java -jar ./build/gcc/compiler.jar #{formatting} --module_wrapper 'main:(function() {%s}.call(this)' --module_output_path_prefix #{moduleDir} --compilation_level #{compilationLevel} #{moduleStr}", (err, stdout, stderr) ->
      throw err if err
      cb stdout, stderr

  moveArtifacts = (cb = ->) ->
    callbacksCount = 0
    fileCount = 0
    moduleDir = "#{config.tmp}/modules"
    for moduleName, path of config.outMappings
      if config.modules[moduleName].enabled isnt false
        ++fileCount
        copy "#{moduleDir}/#{moduleName}.js", "#{config.out}/#{path}", () ->
          if ++callbacksCount is fileCount
            cb()

  clean = (cb = ->) ->
    exec "rm -rf #{config.tmp}", (err,stdout) ->
      throw err if err
      cb()


  #MAIN
  processConfig ->
    console.log 'Processed config.'
    createClosureModules (moduleStr) ->
      console.log 'Created Closure Compiler modules.'
      execClosureCompiler moduleStr, (stdout, stderr) ->
        if !!stderr
          console.error 'Error running closure compiler', stdout, stderr
        else console.log 'Created compiler modules.'
        moveArtifacts ->
          console.log 'Moved compiler modules to output directory.'
          clean ->
            console.log 'Build complete.'