var path = require("path");
var fs = require("fs");
var util = require("util");
var Uglify = require("uglify-js");
var exec = require("child_process").exec;
var Seq = require("seq");

// copy a file from src to dest
exports.copy = function(src, dest, cb) {
  src = path.normalize(src);
  dest = path.normalize(dest);
  var newFile = fs.createWriteStream(dest);
  var oldFile = fs.createReadStream(src);
  newFile.once("open", function(fd) {
    util.pump(oldFile, newFile);
    cb();
  });
};

// grab a file from src and pass to callback
exports.grab = function(src, cb) {
  src = path.normalize(src);
  fs.readFile(src, function (err, data) {
    if (err) {
      cb(err);
    }
    else {
      cb(null, data);
    }
  });
};

// uglify stuff and make it all min-awesome
exports.uglify = function(file, cb) {
  var parser = Uglify.parser;
  var uglifier = Uglify.uglify;
  var ast = parser.parse(file);
  var output = "";

  ast = uglifier.ast_mangle(ast, {
    except: ["require", "define", "easyxdm", "localstorage"]
  });
  ast = uglifier.ast_squeeze(ast);
  output = uglifier.gen_code(ast, {
    ascii_only: true
  });

  cb(null, output);
};

// compile coffeescript
exports.compileCoffeeScript = function(src, cb) {
  var coffeeBinary = path.resolve(".", "node_modules/coffee-script/bin/coffee");
  var cmd = ([
    coffeeBinary,
    "--bare",
    "--print",
    "--compile "+src,
  ]).join(" ");

  Seq()
  .seq(function() {
    exec(cmd, this);
  })
  .seq(function(output) {
    cb(null, output);
  });
};

// write a file to the fs
exports.write = function(dest, file, cb) {
  dest = path.normalize(dest);
  fs.writeFile(dest, file, function(err) {
    if (err) {
      cb(err);
    }
    else {
      cb();
    }
  });
};

// put an anonymous wrapper around the code
exports.anonymize = function(file, cb) {
  cb(null, ([
    "(function(undefined) {",
    file,
    "})();"
  ]).join("\n"));
};

// concatenate an array of files together
exports.concat = function(files, cb) {
  var args = Array.prototype.slice.call(files, 0);
  cb(null, args.join("\n"));
};

// mkdir -p solution
exports.mkdirpSync = function (dir) {
  dir = path.resolve(path.normalize(dir));
  try {
    // XXX hardcoding recommended file mode of 511 (0777 in octal)
    // (note that octal numbers are disallowed in ES5 strict mode)
    fs.mkdirSync(dir, 511)
  }
  catch (err) {
    // and if we fail, base action based on why we failed:
    switch (err.code) {
      // base case: if the path already exists, we're good to go.
      case "EEXIST":
          return

      case "ENOENT":
        mkdirpSync(path.dirname, dir)
        mkdirpSync(dir)
        return;

      default:
        throw err;
    }
  }
};