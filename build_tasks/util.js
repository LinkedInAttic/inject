/*
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
*/

var path = require("path"),
    fs = require("fs"),
    util = require("util"),
    Uglify = require("uglify-js"),
    exec = require("child_process").exec,
    Seq = require("seq"),
    Futures = require("futures");

// copy a file from src to dest
exports.copy = function(src, dest, cb) {
  src = path.normalize(src);
  dest = path.normalize(dest);

  var newFile = fs.createWriteStream(dest),
      oldFile = fs.createReadStream(src);

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
  file = file.toString();

  var parser = Uglify.parser,
      uglifier = Uglify.uglify,
      ast = parser.parse(file),
      output = "";

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
  var coffeeBinary = path.resolve(".", "node_modules/.bin/coffee"),
      cmd = ([
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

// JSDoc a directory
// compile coffeescript
exports.JSDoc = function(src, dest, cb) {
  src = path.normalize(src);
  dest = path.normalize(dest);
  var JSDocBinary = path.resolve(".", "node_modules/JSDoc/jsdoc"),
      cmd = ([
        JSDocBinary,
        "-r",
        "-d "+dest,
        src,
      ]).join(" ");

  Seq()
  .seq(function() {
    exec(cmd, this);
  })
  .seq(function(output) {
    cb(null, true);
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

// put evals on a line
exports.evalToNewLines = function(file, cb) {
  cb(null, file.replace(/eval\(/g, "\neval("));
};

// mkdir -p solution
exports.mkdirpSync = function (dir) {
  dir = path.resolve(path.normalize(dir));
  try {
    // XXX hardcoding recommended file mode of 511 (0777 in octal)
    // (note that octal numbers are disallowed in ES5 strict mode)
    fs.mkdirSync(dir, 511);
  }
  catch (err) {
    // and if we fail, base action based on why we failed:
    switch (err.code) {
      // base case: if the path already exists, we're good to go.
      case "EEXIST":
      case "EISDIR":
        return;

      case "ENOENT":
        exports.mkdirpSync(path.dirname(dir));
        exports.mkdirpSync(dir);
        return;

      default:
        throw err;
    }
  }
};

exports.buildChain = Futures.chainify({
  // providers: data retrieval
  concat: function (next, src, files) {
    var future = Futures.future();

    // make async calls to get data
    if (!files) {
      files = src;
      src = "";
    }

    // Seq chain the inclusion of all files
    Seq()
    .seq(function() {
      this.ok(files);
    })
    .flatten()
    .parEach(function(file) {
      if (file === null) {
        this.into(file)("");
        return;
      }

      var location = path.resolve(src+"/"+file);
      exports.grab(location, this.into(file));
    })
    .seq(function() {
      var name;
      var contents = [];
      for (var i = 0, len = files.length; i < len; i++) {
        name = files[i];
        contents.push(this.vars[name]);
      }
      exports.concat(contents, this);
    })
    .seq(function(contents) {
      next(contents);
    });
  }
}, {
  // modifiers: data changing
  anonymize: function(next, data, signature, invoke) {
    var signature = signature || "";
    var invoke = invoke || "";
    var out = ([
      ";(function("+signature+") {",
        data,
      "})("+invoke+");"
    ]).join("\n");
    next(out);
  },
  write: function(next, data, dir, fileName) {
    dest = path.resolve(dir+"/"+fileName);
    exports.write(dest, data, function() {
      next(data);
    });
  },
  minify: function(next, data, params) {
    try {
      exports.uglify(data, function(err, result) {
        exports.evalToNewLines(result, function(err, fixedResult) {
          next(fixedResult);
        })
      });
    }
    catch(err) {
      console.log(data);
      console.log(err);
      throw err;
    }
  }
}, {
  // consumers
  end: function(data, terminusCB) {
    if (terminusCB && typeof(terminusCB) === "function") {
      terminusCB(data);
    }
  }
});
