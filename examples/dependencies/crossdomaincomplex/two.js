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

// added multiple requires on the same line
var four = require("four"),
    five = require("five"),
    fourObj = new four.Four(),
    fiveObj = new five.Five();


var Two = function() {};
Two.prototype.printNode = function() {
  return  '<div class="node"><div class="row">Two</div>' + 
    		'<div class="row">' + fourObj.printNode() +  fiveObj.printNode() + 
          '</div></div>';
};


exports.Two = Two;