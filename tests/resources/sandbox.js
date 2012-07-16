/*

Sandbox.js: https://github.com/TooTallNate/SandboxJS

 Copyright (c) 2011 Nathan Rajlich

 Permission is hereby granted, free of charge, to any person
 obtaining a copy of this software and associated documentation
 files (the "Software"), to deal in the Software without
 restriction, including without limitation the rights to use,
 copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the
 Software is furnished to do so, subject to the following
 conditions:

 The above copyright notice and this permission notice shall be
 included in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 OTHER DEALINGS IN THE SOFTWARE.
*/
(function(j,k,a){function i(e,b){try{if(delete e[b],!e[b])return}catch(g){}try{if(e[b]=a,!e[b])return}catch(c){}var f;if("__defineGetter__"in e)try{e.__defineGetter__(b,function(){return f}),e.__defineSetter__(b,function(a){f=a})}catch(i){}try{e[b]=a}catch(d){}}function m(a){var c;if(c=(a=a.constructor||a.DOMWindow||a.Window)?a.prototype:a.__proto__,a=c){for(var b in a)try{delete a[b]}catch(f){}for(b in a)i(a,b)}}var g,f={parseInt:a,parseFloat:a,JSON:a,Array:a,Boolean:a,Date:a,Function:a,Number:a,
Object:a,RegExp:a,String:a,Error:a,EvalError:a,RangeError:a,ReferenceError:a,SyntaxError:a,TypeError:a,URIError:a,setTimeout:a,clearTimeout:a,setInterval:a,clearInterval:a,eval:a,execScript:a,undefined:a,escape:a,unescape:a,encodeURI:a,encodeURIComponent:a,decodeURI:a,decodeURIComponent:a,NaN:a,Infinity:a,Math:a,isNaN:a,isFinite:a,location:a,document:a},n=["constructor","Window","DOMWindow","XMLHttpRequest"];j.Sandbox=function(a){this.bare=a=a!==!1?!0:!1;var b=k.createElement("iframe");b.style.display=
"none";var l=k.getElementsByTagName("script")[0];l.parentNode.insertBefore(b,l);var c=b.contentWindow,b=c.document;this.global=c;b.open();b.write("<script>var MSIE/*@cc_on =1@*/;_e=MSIE?this:{eval:function(s){return window.eval(s)}}<\/script>");b.close();var j=c._e;this.eval=function(a){return j.eval(a)};try{delete c._e}catch(o){this.eval("delete _e")}this.load=function(a,b){var d="_s = document.createElement('script');_s.setAttribute('type','text/javascript');_s.setAttribute('src','"+a.replace(/'/g,
"\\'")+"');";if(b){var e=function(a){if(!e.a&&(!this.readyState||/complete|loaded/i.test(this.readyState)))e.a=!0,b(a)};this.eval(d);c._s.onload=c._s.onreadystatechange=e;d=""}this.eval(d+"document.getElementsByTagName('head')[0].appendChild(_s);delete _s;")};this.loadSync=function(){throw Error("NOT YET IMPLEMENTED: Make a GitHub Issue if you need this...");};if(a){var a={},d;for(d in f)a[d]=c[d];if(g===!0)c.__proto__=Object.prototype;else if(g===!1)m.call(this,c);else{b=function(){g=!1;m.call(this,
c)};try{if(c.__proto__){var h=c.__proto__;h._$=!0;c._$!==!0&&b();c.__proto__=Object.prototype;if(c._$)delete h._$,c.__proto__=h,b();g!==!1&&(g=!0)}}catch(p){b()}}for(d in c)d in f||i(c,d);d=0;for(h=n.length;d<h;d++)b=n[d],b in f||i(c,b);for(d in f)c[d]||(c[d]=a[d]);a=null}c.global=c}})(window,document);