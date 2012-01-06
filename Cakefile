###
Inject
Copyright 2011 Jakob Heuser

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing,
software distributed under the License is distributed on an "AS
IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
express or implied.   See the License for the specific language
governing permissions and limitations under the License.
###

PROJECT = "inject"

path = require("path")
fs= require("fs")
exec = require("child_process").exec

option '', '--config-file [FILE]', 'Load in a json file as config. Defaults to: null.'
option '', '--project-name [NAME]', 'Used in default config to specify final output for raw and min "targets". Defaults to: "inject".'
option '', '--project-version [VERSION]', 'Used in default config to add version folders to "out" directory. Defaults to: "dev".'
option '', '--temporary-directory [DIR]', 'Where to save temporary files. Gets deleted after build. Defaults to: "./tmp/".'
option '', '--output-directory [DIR]', 'Where to save compressed/compiled files. Defaults to: "./artifacts/".'
option '', '--with-ie',      'Add IE 6/7 support. Adds a localStorage and JSON shim (by default, named: ie-localstorage-json-shim.js). Both are required for lscache. Defaults to true.'
option '', '--without-xd',   'Remove Porthole. Porthole is only used when requiring files cross-domain. Defaults to false.'
option '', '--without-json', 'Force JSON support to be dropped. Defaults to false.'
option '', '--compilation-level [LEVEL]', 'Level to compile output js to. If WHITESPACE_ONLY is selected then pretty formatting is used. Defaults to SIMPLE_OPTIMIZATIONS.'

task "build", "Builds inject library", (options)->

  configFile = options['config-file']
  PROJECT = options['project-name'] or 'inject'
  VERSION = options['project-version'] or 'dev'
  supportIE = !options['with-ie']
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
        compilationLevel: compilationLevel
        output_wrapper: ->
          wrapper = fs.readFileSync(config.src + '/iecompat_wrapper.txt').toString()
          wrapper = wrapper.replace(/"/g,'\\"')
          return '"' + wrapper + '"'
        files:['localstorage-shim.js','json.js']
      }
      'crossDomain':{
        enabled:supportXD
        files:['relay.html','porthole.js']
      }
      'inject':{
        files:['lscache.js','inject.coffee']
        modules: ['crossDomain']
      }
      'main' :{
        compilationLevel:'WHITESPACE_ONLY'
        formatting:'pretty_print'
        modules:['header','inject']
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

  if configFile
    try
      config = JSON.parse(fs.readFileSync(configFile))
    catch e
      console.error "Error loading configFile: #{configFile}", e

  compileCoffeescript = (file = '', toDir = '', cb = ->) ->
    console.log "Compiling coffeescript #{file} => #{toDir}"
    name = (file.match(/\/([^\/]+)\.coffee$/i)||[]).pop()
    exec "coffee --bare --output #{toDir} --compile #{file}", (err, stdout, stderr) ->
      throw err if err
      cb toDir + name + '.js'

  copy = (from = '', toDir = '', cb = ->) ->
    console.log "Copy #{from} => #{toDir}"
    if from and toDir
      exec "cp #{from} #{toDir}", (err) ->
        throw err if err
        cb null
    else cb from

  processConfig = (newStyle = false, cb = ->) ->
    loopCount = 0
    totalFiles = 0
    updateFileReference = (ref, i, file) ->
      # if file was modified above, update the reference
      if file
        ref.files[i] = file
      # if file is null, remove the reference
      else
        ref.files.splice(i,1)

      if ++loopCount is totalFiles
        finalizeConfig()

    finalizeConfig = ->
      if newStyle
        for moduleName, mod of config.modules
          mod.files = recurseModules(mod)
          delete mod.modules
      cb()

    recurseModules = (mod) ->
      files = mod.files || []
      if mod.modules and mod.modules.length > 0
        for mod in mod.modules.reverse()
          files = recurseModules(config.modules[mod]).concat(files)
      return if mod.enabled isnt false then files else mod.files

    #loop through all files and compile or copy
    for moduleName, mod of config.modules
      if mod.files and mod.enabled isnt false
        # must loop backwards since we're modifying the array
        for i in [mod.files.length - 1..0] by -1

          # prefix with the path to the tmp folder and make sure it's a real path
          file = path.normalize config.src + mod.files[i]

          # if it's coffeescript then compile and update reference to the file
          if /\.coffee$/.test(file)
            compileCoffeescript file, config.tmp, updateFileReference.bind null, mod, i

          # if it's anything but js, just copy it and remove the reference to this file
          else if !/\.js$/.test(file)
            copy file, config.out, updateFileReference.bind null, mod, i

          # else, update the reference anyways
          else
            updateFileReference mod, i, file

          #keep track of files for callback
          totalFiles += 1


  createClosureModulesStr = (cb = ->) ->
    #expected syntax: --module MODULE_NAME:FILE_COUNT:DEP,DEP,DEP --js FILE
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

  createClosureCompilerCmd = (allDoneCallback, execFn = ->) ->

    allDoneFn = ->
      if ++callbackCount is mappingsCount
        allDoneCallback()

    mappingsCount = 0
    callbackCount = 0
    for moduleName, path of config.outMappings
      mappingsCount += 1
      mod = config.modules[moduleName]
      cmdCompilationLevel = mod.compilationLevel or compilationLevel
      formatting = if cmdCompilationLevel is 'WHITESPACE_ONLY' then '--formatting pretty_print' else ''
      output_wrapper = mod.output_wrapper || "'(function() {%output%}).call(this)'"
      if typeof(output_wrapper) is 'function'
        output_wrapper = output_wrapper()
      cmd = "--js_output_file #{config.out}/#{path} #{formatting} --output_wrapper #{output_wrapper} --compilation_level #{cmdCompilationLevel} --js "
      files = mod.files or []

      if mod.enabled isnt false
        console.log 'Created cmd to compile module: ', moduleName
        execFn(cmd + files.join(' --js '), allDoneFn)
      else
        allDoneFn

  execClosureCmd = (cmd, cb = ->) ->
    exec "java -jar ./build/gcc/compiler.jar #{cmd}", (err, stdout, stderr) ->
      throw err if err
      cb stdout, stderr

  createClosureModules = (moduleStr, cb = ->) ->
    moduleDir = path.normalize("#{config.tmp}/modules/")
    formatting = if compilationLevel is 'WHITESPACE_ONLY' then '--formatting pretty_print' else ''
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
    exec "rm -rf #{config.tmp}", (err) ->
      console.error err if err
      cb()

  unclean = (cb = ->) ->
    fs.mkdir config.tmp, 0777, (err) ->
      console.error err if err and err.errno isnt 47 and err.errno isnt 17 # 47 is directory already exists. This is ok for the purposes of this function
      fs.mkdir config.out, 0777, (err) ->
        console.error err if err and err.errno isnt 47 and err.errno isnt 17 # directory already exists.
        cb()

  #MAIN
  unclean ->
    console.log 'Created working directories.'
    processConfig true, ->
      console.log 'Processed config.'
      allDone = () ->
        clean ->
          console.log 'Build complete.'
      createClosureCompilerCmd allDone, (cmd, callback) ->
        execClosureCmd cmd, callback

  #OLD MAIN
  ###
  processConfig false, ->
    console.log 'Processed config.'
    createClosureModulesStr (moduleStr) ->
      console.log 'Created Closure Compiler modules.'
      createClosureModules moduleStr, (stdout, stderr) ->
        if !!stderr
          console.error 'Error running closure compiler', stdout, stderr
        else console.log 'Created compiler modules.'
        moveArtifacts ->
          console.log 'Moved compiler modules to output directory.'
          clean ->
            console.log 'Build complete.'
  ###