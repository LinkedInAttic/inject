/*global Inject:true */
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
 * The text plugin enables the loading of plain text.
 * This can also serve as a template for more complex text
 * transformations such as markdown syntax
 * @file
**/
(function () {
  Inject.addFetchRule(/^text\!.+$/, function(next, content, resolver, comm, options) {
    var moduleId = options.moduleId.replace(/^text!\s*/, '');
    var resolvedMid = resolver.module(moduleId, options.parentId);
    var path = resolver.url(resolvedMid, options.parentUrl, true);

    comm.get(resolvedMid, path, function(text) {
      next(null, ['',
        'var text = "',
        encodeURIComponent(text),
        '";',
        'module.setExports(decodeURIComponent(text));',
        ''].join('')
      );
    });
  });
})();
