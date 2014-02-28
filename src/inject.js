/*
Inject
Copyright 2013 LinkedIn

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
(function(context, undefined) {
  // --------------------------------------------------
  // ENVIRONMENT
  // --------------------------------------------------
  var InjectContext;
  function init(version) {
    var ic = InjectContext.createContext();
    context.require = ic.require;
    context.define = ic.define;
    context.Inject = ic.Inject;
    context.Inject.version = version;
  }
  
  // --------------------------------------------------
  // INCLUDES/
  // --------------------------------------------------
  //@@include('./includes/commonjs.js')
  //@@include('./includes/constants.js')
  //@@include('./includes/globals.js')

  // --------------------------------------------------  
  // XD COLLECTION
  // --------------------------------------------------
  //@@include('./xd/postmessage.js')

  // --------------------------------------------------
  // FIBER
  // --------------------------------------------------
  //@@include('./lib/fiber.pre.js')
  //@@include('../tmp/lib/fiber/fiber.js')
  //@@include('./lib/fiber.post.js')
  
  // --------------------------------------------------
  // FLOW
  // --------------------------------------------------
  //@@include('./lib/flow.js')
  
  // --------------------------------------------------
  // LSCACHE
  // --------------------------------------------------
  //@@include('./lib/lscache.js')
  //@@include('./lib/lscache.post.js')

  // --------------------------------------------------
  // INJECT FILES
  // --------------------------------------------------
  //@@include('./analyzer.js')
  //@@include('./communicator.js')
  //@@include('./executor.js')
  //@@include('./injectcontext.js')
  //@@include('./requirecontext.js')
  //@@include('./rulesengine.js')
  //@@include('./treenode.js')
  //@@include('./treerunner.js')
  
  // initialize
  init('//@@INJECT_VERSION');
})(this);