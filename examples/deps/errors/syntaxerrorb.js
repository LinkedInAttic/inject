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

if (console && typeof(console.log) === "function") {
  console.log("error file executing");
}
// this file contains a syntax error
// it's used to show how line numbers are preserved for errors

var use = true;

function padding() {
	var str = "";
	str += "this is a string to change the line numbers";
	str += "it should put the line number to a unique location";
	str += "1";
	str += "2";
	str += "3";
	str += "4";
}

// syntax error, line 39/40 or 44 for end of input
var barTwo = function() {
  // here is the error
  if (use {
  	true;
  }
};

exports.test = true