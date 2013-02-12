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
var two = require("two"),
    three = require("three"),
    twoObj = new two.Two(),
    threeObj = new three.Three();


var One = function() {};
One.prototype.printNode = function() {
  return  '<div class="node"><div class="row">One</div><div class="row">' + 
          twoObj.printNode() +
          threeObj.printNode() +  
          '</div></div>';
};


exports.One = One;