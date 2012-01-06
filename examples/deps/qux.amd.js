/*
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
*/

// AMD, define a module with moduleId, deps, callback
define('qux.amd', ['exports', 'bar', 'foo'], function(exports, bar, foo) {
  var qux = function() {
    this.appender = ' from qux.amd!';
    this.sampleString = foo.sampleString + this.appender;
  };

  qux.prototype.Qux = function() {
    return 'I am Qux ' + this.appender;
  };

  exports.qux = qux;
  exports.bar = bar.Bar;
});
