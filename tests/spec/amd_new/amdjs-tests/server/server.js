var util = require('util');
var path = require('path');
var fs = require('fs');
var express = require('express');
var manifest = require('./manifest').manifest;
var app = express();

app.get('/', function(req, res) {
  // run all tests
  if (req.query)
  fs.readFile(path.normalize(path.join(__dirname, './resources/all.html')), function(err, data) {
    var frameworkConfigScriptTag = (req.query.framework) ? '<script src="/config/'+req.query.framework+'.js"></script>' : '';
    var frameworkLibScriptTag = (req.query.framework) ? '<script src="/framework/'+req.query.framework+'.js"></script>' : '';

    var frameworkOptions = [];
    for (var id in manifest) {
      frameworkOptions.push('<option value="'+id+'">'+manifest[id].name+'</option>');
    }
    
    var output = data.toString()
      .replace(/\{\{HASTESTS\}\}/g, (req.query.framework) ? 'has-tests' : '')
      .replace(/\{\{FRAMEWORK_OPTIONS\}\}/g, frameworkOptions.join('\n'))
      .replace(/\{\{FRAMEWORK\}\}/g, req.query.framework)
      .replace(/\{\{FRAMEWORK_CONFIG\}\}/, frameworkConfigScriptTag)
      .replace(/\{\{FRAMEWORK_LIB\}\}/, frameworkLibScriptTag);
    res.end(output);
  });
});

app.get('/util/reporter.js', function(req, res) {
  // load the reporters
  fs.readFile(path.normalize(path.join(__dirname, './resources/reporter.js')), function(err, data) {
    res.end(data.toString());
  });
});

app.get('/util/all.js', function(req, res) {
  // load the reporters
  fs.readFile(path.normalize(path.join(__dirname, './resources/all.js')), function(err, data) {
    res.end(data.toString());
  });
});

app.get('/util/all.css', function(req, res) {
  // load the reporters
  fs.readFile(path.normalize(path.join(__dirname, './resources/all.css')), function(err, data) {
    res.end(data.toString());
  });
});

app.get('/framework/:framework', function(req, res) {
  // load a framework file
  var framework = req.params.framework.replace(/\.js$/, '');
  fs.readFile(path.normalize(path.join(__dirname, '../impl/'+manifest[framework].impl)), function(err, data) {
    res.end(data.toString());
  });
});

app.get('/config/:framework', function(req, res) {
  // load a config file
  var framework = req.params.framework.replace(/\.js$/, '');
  fs.readFile(path.normalize(path.join(__dirname, '../impl/'+manifest[framework].config)), function(err, data) {
    res.end(data.toString());
  });
});

app.get('/:framework/:test/test.html', function(req, res) {
  // run one test
  fs.readFile(path.normalize(path.join(__dirname, './resources/template.html')), function(err, data) {
    var framework = '/framework/'+req.params.framework+'.js';
    var fwkConfig = '/config/'+req.params.framework+'.js';
    var reporter = '/util/reporter.js';
    var testFile = '/'+req.params.framework+'/'+req.params.test+'/_test.js';
    var testName = req.params.test;

    var output = data.toString()
      .replace(/\{\{FRAMEWORK\}\}/g, framework)
      .replace(/\{\{FRAMEWORK_CONFIG\}\}/g, fwkConfig)
      .replace(/\{\{REPORTER\}\}/g, reporter)
      .replace(/\{\{TEST\}\}/g, testFile)
      .replace(/\{\{TEST_NAME\}\}/g, testName);
    res.end(output);
  });
});

app.get('/:framework/:test/*', function(req, res) {
  // get a file for the specified test
  var testPath = '../tests/'+req.params.test+'/'+req.params[0];
  fs.readFile(path.normalize(path.join(__dirname, testPath)), function(err, data) {
    res.end(data.toString());
  });
});

app.listen(4000);

util.log('AMD JS Test server running on port 4000');
util.log('To run:  http://localhost:4000');