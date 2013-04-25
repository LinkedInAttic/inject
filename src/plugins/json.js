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
 * The JSON plugin handles the loading of a JSON object
 * This allows you to take data and "require" it in. Useful
 * scenarios include things like config files.
 * @file
**/
(function () {
  Inject.addFetchRule(/^json\!.+$/, function(next, content, resolver, comm, options) {
    var moduleId = options.moduleId.replace(/^json!\s*/, '');
    var resolvedMid = resolver.module(moduleId, options.parentId);
    var path = resolver.url(resolvedMid, options.parentUrl, true);

    comm.get(resolvedMid, path, function(text) {
      next(null, ['',
        'var json = "',
        encodeURIComponent(text),
        '";',
        'module.setExports(JSON.parse(decodeURIComponent(json)));',
        ''].join('')
      );
    });
  });
})();
