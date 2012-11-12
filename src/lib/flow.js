/*
Go With the Flow
Copyright (c) 2011 Jerome Etienne, http://jetienne.com

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

var Flow  = function(){
  var self, stack = [], timerId = setTimeout(function(){ timerId = null; self._next(); }, 0);
  return self = {
    destroy : function(){ timerId && clearTimeout(timerId); },
    par : function(callback, isSeq){
      if(isSeq || !(stack[stack.length-1] instanceof Array)) stack.push([]);
      stack[stack.length-1].push(callback);
      return self;
    },seq : function(callback){ return self.par(callback, true);  },
    _next : function(err, result){
      var errors = [], results = [], callbacks = stack.shift() || [], nbReturn = callbacks.length, isSeq = nbReturn == 1;
      for(var i = 0; i < callbacks.length; i++){
        (function(fct, index){
          fct(function(error, result){
            errors[index] = error;
            results[index]  = result;   
            if(--nbReturn == 0) self._next(isSeq?errors[0]:errors, isSeq?results[0]:results)
          }, err, result)
        })(callbacks[i], i);
      }
    }
  }
};