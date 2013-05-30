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
(function () {
  var style = document.createElement('style');
  style.type = 'text/css';
  var placed = false;
  var useCssText = (style.styleSheet) ? true : false;

  function CSS(txt) {
    this.txt = txt;
  }
  CSS.prototype.attach = function () {
    Inject.plugins.css.addStyles(this.txt);
  };

  Inject.plugin('css',
  // ruleset
  {
    useSuffix: false,
    path: function (path) {
      return path.replace(/^css!\s*/, '');
    },
    pointcuts: {
      afterFetch: function (next, text) {
        next(null, ['',
          ['var cssText = decodeURIComponent("', encodeURIComponent(text), '");'].join(''),
          'module.setExports(Inject.plugins.css.create(cssText))',
          ''].join('\n')
        );
      }
    }
  },
  // functions
  {
    create: function (text) {
      return new CSS(text);
    },
    addStyles: function (text) {
      if (useCssText) {
        style.styleSheet.cssText = [style.innerHTML, text].join('\n');
      }
      else {
        style.appendChild(document.createTextNode(text));
      }
      if (!placed) {
        placed = true;
        document.getElementsByTagName('head')[0].appendChild(style);
      }
    }
  });
})();;/*global Inject:true */
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
 * transformations such as markdown syntax (just mutate in
 * the "after" pointcut)
 * @file
**/
(function () {
  Inject.plugin('text',
  // ruleset
  {
    useSuffix: false,
    path: function (path) {
      return path.replace(/^text!\s*/, '');
    },
    pointcuts: {
      afterFetch: function (next, text) {
        next(null, ['',
          'var text = "',
          encodeURIComponent(text),
          '";',
          'module.setExports(decodeURIComponent(text));',
          ''].join('')
        );
      }
    }
  },
  {});
})();;/*global Inject:true */
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
  Inject.plugin('json',
  // ruleset
  {
    useSuffix: false,
    path: function (path) {
      return path.replace(/^json!\s*/, '');
    },
    pointcuts: {
      afterFetch: function (next, text) {
        next(null, ['',
          'var json = "',
          encodeURIComponent(text),
          '";',
          'module.setExports(JSON.parse(decodeURIComponent(json)));',
          ''].join('')
        );
      }
    }
  },
  {});
})();