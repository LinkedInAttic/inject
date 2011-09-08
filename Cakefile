VERSION = "0.1.0"
PROJECT = "inject"

fs = require("fs")
exec = require("child_process").exec

files = [
  "copyright.js"
  "licenses.js"
  "inject.coffee"
]

task "build", "Build the Project", ->
  index = 0
  remaining = files.length
  allContents = []
  
  readCompileFile = (file, index) ->
    if file.indexOf(".coffee") == -1
      # read file into slot
      console.log "Reading #{file}"
      fs.readFile "./src/#{file}", "utf8", (err, contents) ->
        throw err if err
        remaining--
        allContents[index] = contents
        if remaining is 0 then cleanArtifacts()
    else
      # compile
      console.log "Compiling #{file}"
      exec "coffee --output ./artifacts/tmp --compile ./src/#{file} ", (err, stdout, stderr) ->
        throw err if err
        newFile = file.replace(".coffee", ".js")
        fs.readFile "./artifacts/#{newFile}", "utf8", (err, contents) ->
          remaining--
          allContents[index] = contents
          if remaining is 0 then cleanArtifacts()
  
  for file, index in files
    readCompileFile(file, index)
  cleanArtifacts = () ->
    # clean artifacts directory
    exec "rm -rf ./artifacts/tmp", (err, stdout, stderr) ->
      throw err if err
      writeJS()
  writeJS = () ->
    fs.writeFile "artifacts/#{PROJECT}-#{VERSION}.js", allContents.join("\n\n"), "utf8", (err) ->
      throw err if err
      copyFiles()
  copyFiles = () ->
    srcFile = fs.createReadStream("./src/relay.html");
    artFile = fs.createWriteStream("./artifacts/relay-#{VERSION}.html");
    srcFile.once "open", () ->
      require("util").pump srcFile, artFile, () ->
        complete()
  complete = () ->
    console.log "Complete!"