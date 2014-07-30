/*global document:true, Inject:true */
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
 * The CSS plugin handles the loading of stylesheets
 * It returns a CSS object with one method, attach
 * @file
**/
window.INJECT_PLUGINS = window.INJECT_PLUGINS || {};

(function() {

  var style = document.createElement('style'),
      placed = false,
      injectedCSS = '',
      useCssText;

  style.type = 'text/css';
  useCssText = !!(style.styleSheet);
  
  function CSS(txt) {
    this.txt = txt;
  }
  CSS.prototype.attach = function () {
    addStyles(this.txt);
  };
  
  function addStyles(text) {
    if (useCssText) {
      injectedCSS += text;
      style.styleSheet.cssText = injectedCSS;
    }
    else {
      style.appendChild(document.createTextNode(text));
    }
    if (!placed) {
      placed = true;
      document.getElementsByTagName('head')[0].appendChild(style);
    }
  }
  
  window.INJECT_PLUGINS.css = function(inject) {
    inject.addFetchRule(/^css\!.+$/, function(next, content, resolver, comm, options) {
      var moduleId = options.moduleId.replace(/^css!\s*/, '');
      var resolvedMid = resolver.module(moduleId, options.parentId);
      var path = resolver.url(resolvedMid, options.parentUrl, true);

      comm.get(resolvedMid, path, function(text) {
        next(null, ['',
          ['var cssText = decodeURIComponent("', encodeURIComponent(text), '");'].join(''),
          'module.setExports(window.INJECT_PLUGINS.css.create(cssText))',
          ''].join('\n')
        );
      });
    });
  };
  
  window.INJECT_PLUGINS.css.create = function(text) {
    return new CSS(text);
  };
})();