VERSION = "0.2.0"
PROJECT = "inject"

fs = require("fs")
exec = require("child_process").exec
path = require("path")
compiler = "java -jar ./build/gcc/compiler.jar --compilation_level SIMPLE_OPTIMIZATIONS"

option '', '--with-ie',      'Add IE 6/7 support. Adds a localStorage and JSON shim. Both are required for lscache'
option '', '--without-xd',   'Remove Porthole. Porthole is only used when requiring files cross-domain.'
option '', '--without-json', 'Force JSON support to be dropped.'
option '', '--compilation-level [LEVEL]', 'Level to compile output js to. Defaults to compiling both SIMPLE_OPTIMIZATIONS and WHITESPACE_ONLY. If WHITESPACE_ONLY is selected then pretty formatting is used'
task "build", "Builds inject library", (options)->
  supportIE = !!options['with-ie']
  supportJSON = supportIE and !!options['without-json']
  supportXD = !options['without-xd']
  compilationLevel = options['compilation-level'] || 'SIMPLE_OPTIMIZATIONS'

  src = 'src/'
  tmp = 'tmp/'
  files = [
    {
      src: "lscache.js"
      out: "lscache_#{VERSION}.js"
      type: 'js'
    }
    {
      src: "inject2.coffee"
      out: "inject_#{VERSION}.js"
      type: 'coffee'
    }
  ]

  if supportXD
    files.unshift(
      {
        src: "porthole.js"
        out: "porthole_#{VERSION}.js"
        type: 'js'
      }
      {
        src: "relay.html"
        out: "relay.html"
        type: 'html'
      }
    )
  if supportJSON
    files.unshift({
      src: "'json.js"
      out: "'json_#{VERSION}.js"
      type: 'js'
    })
  if supportIE
    files.unshift({
      src: "localstorage-shim.js"
      out: "localstorage-shim_#{VERSION}.js"
      type: 'js'
    })


  #add licenses/copyright notices first
  files.unshift({
    src: "licenses.js"
    out: "liceses_#{VERSION}.js"
    type: 'js'
  }
  {
    src: "copyright.js"
    out: "copyright_#{VERSION}.js"
    type: 'js'
  })

  compilerFiles = []

  copy = (from, to, cb) ->
    console.log "Copy #{from} => #{to}"
    srcFile = fs.createReadStream("#{from}");
    outFile = fs.createWriteStream("#{to}");
    srcFile.once "open", () ->
      require("util").pump srcFile, outFile, () ->
        cb(null, null)

  closureCompile = (prettyPrint = false, cb = ->)->
    file = "#{tmp}/#{PROJECT}_#{VERSION}_#{compilationLevel}.js"
    jsFiles = compilerFiles.join(' --js ')
    formatting = if prettyPrint then "--formatting pretty_print" else ""
    output_wrapper = "'(function() {%output%}.call(this)'"
    console.log "java -jar ./build/gcc/compiler.jar #{formatting} --js #{jsFiles} --output_wrapper #{output_wrapper} --compilation_level #{compilationLevel} --js_output_file #{file}"
    exec "java -jar ./build/gcc/compiler.jar #{formatting} --js #{jsFiles} --output_wrapper #{output_wrapper} --compilation_level #{compilationLevel} --js_output_file #{file}", (err, compiledSource, stderr) ->
      throw err if err
      cb && cb(file)


  isDoneCopying = (count) ->
    if count is files.length
      closureCompile compilationLevel is "WHITESPACE_ONLY", (compiledFile, err) ->
        console.log 'done compiling', compiledFile
      console.log 'done copying'


  compileCoffeescript = (file, cb) ->
    exec "coffee --bare --compile #{tmp}#{file.out}", (err, stdout, stderr) ->
      throw err if err
      cb(err, file)


  copyCallbackCount = 0
  for file in files
    if /\.js$/.test(file.out)
      compilerFiles.push(tmp + file.out)

    ((file) ->
      copy src + file.src, tmp + file.out, (err, o) ->
        throw err if err
        if file.type is 'coffee'
          compileCoffeescript file, (err, oFile) ->
            console.log 'compile coffeescript',file
            isDoneCopying ++copyCallbackCount
        else
          isDoneCopying ++copyCallbackCount
    )(file)