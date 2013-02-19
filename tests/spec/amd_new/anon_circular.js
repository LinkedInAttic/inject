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
 * @venus-include ../../../artifacts/inject-dev/inject.js
 * @venus-include ../../resources/amdjs_bridge.js
 * @venus-copy ./amdjs-tests/tests/anon_circular/* ./*
 * @venus-include ./amdjs-tests/tests/anon_circular/_test.js
 */

// bridge code for the AMD-JS test library