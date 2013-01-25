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

/**
 * @venus-library qunit
 * @venus-include ../../resources/config.js
 * @venus-include ../../resources/sinon.js
 * @venus-include ../../../artifacts/inject-dev/inject.js
 * @venus-include ../../../artifacts/inject-dev/inject-plugins.js
 */

Inject.reset();
Inject.setModuleRoot('/tests/integration/tests/plugins');

// query-string
asyncTest("Plugin infrastructure is working correctly", 1, function() {
  require.ensure(['text-plugin'], function (require) {
    var txt = require('text-plugin').run();
    equal(txt, 'qwertyuiop', 'Inject plugin architecture works correctly');
    start();
  });
});