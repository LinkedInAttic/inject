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

// this file contains a type error

function outOfRange() {
  var foo = 'foo';
}

outOfRange();

//range error, line 27
outOfRange.error = new Array(Number.MAX_VALUE);

exports.test = true
