/*
Content-Type: multipart/related; boundary="_IE_LOCALSTORAGE_SHIM"

--_IE_LOCALSTORAGE_SHIM
Content-Location:storeone
Content-Transfer-Encoding:base64

R0lGODlhAQABAIABAP///wAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==

--_IE_LOCALSTORAGE_SHIM
Content-Location:storetwo
Content-Transfer-Encoding:base64

PGh0bWw+PGhlYWQ+PHRpdGxlPjwvdGl0bGU+PC9oZWFkPjxib2R5PjxiIGlkPSJsb2NhbHN0b3JhZ2UtaWVzaGltLWluamVjdCIgY2xhc3M9InVzZXJEYXRhIiBzdHlsZT0iYmVoYXZpb3I6dXJsKCcjZGVmYXVsdCN1c2VyRGF0YScpIj48L2I+PHNjcmlwdD4oZnVuY3Rpb24gZ2V0VXNlckRhdGEoKXt2YXIgaWQ9ImxvY2Fsc3RvcmFnZS1pZXNoaW0taW5qZWN0IixiPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGlkKTt0cnl7Yi5sb2FkKGlkKX1jYXRjaChlKXtzZXRUaW1lb3V0KGdldFVzZXJEYXRhLDApfX0oKSk8L3NjcmlwdD48L2JvZHk+PC9odG1sPg==

--_IE_LOCALSTORAGE_SHIM--
/*
Inject (c) 2011 LinkedIn. Apache 2.0 License
This creates assets for the localstorage shim via a multipart object.
The file is itself a an image, iframe contents, and the JS for operating a
localstorage facade in front of IE's userData object.

http://www.base64encode.org
http://www.base64decode.org

storeone:
GIF/89a image

storetwo:
<html><head><title></title></head><body><b id="localstorage-ieshim-inject" class="userData" style="behavior:url('#default#userData')"></b><script>(function getUserData(){var id="localstorage-ieshim-inject",b=document.getElementById(id);try{b.load(id)}catch(e){setTimeout(getUserData,0)}}())</script></body></html>

*/
(function(){function o(e){return e?"ie"+e.replace(/[^-._0-9A-Za-z\xb7\xc0-\xd6\xd8-\xf6\xf8-\u037d-\u1fff\u200c-\u200d\u203f\u2040\u2070-\u218f]/g,"-"):e}function u(e){return e?e.replace(/^ie/,""):e}function a(){function l(){var t;f=[];try{t=a.XMLDocument.documentElement.attributes;for(var n=0,r=t.length;n<r;n++)f.push(t[n].nodeName)}catch(s){if(e)throw s}i.length=f.length}var t=n.contentWindow.document,r="localstorage-ieshim-inject",a=t.getElementById(r),f=[];i={getItem:function(t){var n=null;t=o(t);try{a.load(r),n=a.getAttribute(t)}catch(i){if(e)throw i}return n},setItem:function(e,t){e=o(e);try{a.setAttribute(e,t.toString()),l(),a.save(r)}catch(n){throw new s("QUOTA_EXCEEDED_ERR","userData quota exceeded.")}l()},removeItem:function(t){t=o(t);try{a.removeAttribute(t),l(),a.save(r)}catch(n){if(e)throw n}},key:function(e){return l(),u(f[e])},clear:function(){l();for(var e=f.length-1,t;e>=0;e--)t=i.key(e),t&&i.removeItem(t)},length:f.length},window.localStorage=window.localStorage||i,l()}var e=!1,t=["getItem","setItem","removeItem","key","clear"],n=document.createElement("iframe"),r=document.getElementById("ie-localstorage-shim"),i={},s;s=function(e,t){this.name=e,this.message=t},s.prototype=new Error,n.src=r?"mhtml:"+r.getAttribute("src",-1)+"!storetwo":"/favicon.ico",n.style.display="none",n.attachEvent("onload",a),r.parentNode.insertBefore(n,r)})();var JSON;JSON||(JSON={}),function(){"use strict";function f(e){return e<10?"0"+e:e}function quote(e){return escapable.lastIndex=0,escapable.test(e)?'"'+e.replace(escapable,function(e){var t=meta[e];return typeof t=="string"?t:"\\u"+("0000"+e.charCodeAt(0).toString(16)).slice(-4)})+'"':'"'+e+'"'}function str(e,t){var n,r,i,s,o=gap,u,a=t[e];a&&typeof a=="object"&&typeof a.toJSON=="function"&&(a=a.toJSON(e)),typeof rep=="function"&&(a=rep.call(t,e,a));switch(typeof a){case"string":return quote(a);case"number":return isFinite(a)?String(a):"null";case"boolean":case"null":return String(a);case"object":if(!a)return"null";gap+=indent,u=[];if(Object.prototype.toString.apply(a)==="[object Array]"){s=a.length;for(n=0;n<s;n+=1)u[n]=str(n,a)||"null";return i=u.length===0?"[]":gap?"[\n"+gap+u.join(",\n"+gap)+"\n"+o+"]":"["+u.join(",")+"]",gap=o,i}if(rep&&typeof rep=="object"){s=rep.length;for(n=0;n<s;n+=1)typeof rep[n]=="string"&&(r=rep[n],i=str(r,a),i&&u.push(quote(r)+(gap?": ":":")+i))}else for(r in a)Object.prototype.hasOwnProperty.call(a,r)&&(i=str(r,a),i&&u.push(quote(r)+(gap?": ":":")+i));return i=u.length===0?"{}":gap?"{\n"+gap+u.join(",\n"+gap)+"\n"+o+"}":"{"+u.join(",")+"}",gap=o,i}}typeof Date.prototype.toJSON!="function"&&(Date.prototype.toJSON=function(e){return isFinite(this.valueOf())?this.getUTCFullYear()+"-"+f(this.getUTCMonth()+1)+"-"+f(this.getUTCDate())+"T"+f(this.getUTCHours())+":"+f(this.getUTCMinutes())+":"+f(this.getUTCSeconds())+"Z":null},String.prototype.toJSON=Number.prototype.toJSON=Boolean.prototype.toJSON=function(e){return this.valueOf()});var cx=/[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,escapable=/[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,gap,indent,meta={"\b":"\\b","	":"\\t","\n":"\\n","\f":"\\f","\r":"\\r",'"':'\\"',"\\":"\\\\"},rep;typeof JSON.stringify!="function"&&(JSON.stringify=function(e,t,n){var r;gap="",indent="";if(typeof n=="number")for(r=0;r<n;r+=1)indent+=" ";else typeof n=="string"&&(indent=n);rep=t;if(!t||typeof t=="function"||typeof t=="object"&&typeof t.length=="number")return str("",{"":e});throw new Error("JSON.stringify")}),typeof JSON.parse!="function"&&(JSON.parse=function(text,reviver){function walk(e,t){var n,r,i=e[t];if(i&&typeof i=="object")for(n in i)Object.prototype.hasOwnProperty.call(i,n)&&(r=walk(i,n),r!==undefined?i[n]=r:delete i[n]);return reviver.call(e,t,i)}var j;text=String(text),cx.lastIndex=0,cx.test(text)&&(text=text.replace(cx,function(e){return"\\u"+("0000"+e.charCodeAt(0).toString(16)).slice(-4)}));if(/^[\],:{}\s]*$/.test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g,"@").replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g,"]").replace(/(?:^|:|,)(?:\s*\[)+/g,"")))return j=
eval("("+text+")"),typeof reviver=="function"?walk({"":j},""):j;throw new SyntaxError("JSON.parse")})}()