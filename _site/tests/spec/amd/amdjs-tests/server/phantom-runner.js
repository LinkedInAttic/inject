// phantomJS runner
// http://phantomjs.org/download.html

/**
 * Wait until the test condition is true or a timeout occurs. Useful for waiting
 * on a server response or for a ui change (fadeIn, etc.) to occur.
 *
 * @param testFx javascript condition that evaluates to a boolean,
 * it can be passed in as a string (e.g.: "1 == 1" or "$('#bar').is(':visible')" or
 * as a callback function.
 * @param onReady what to do when testFx condition is fulfilled,
 * it can be passed in as a string (e.g.: "1 == 1" or "$('#bar').is(':visible')" or
 * as a callback function.
 * @param timeOutMillis the max amount of time to wait. If not specified, 3 sec is used.
 */
function waitFor(testFx, onReady, timeOutMillis) {
  var maxtimeOutMillis = timeOutMillis ? timeOutMillis : 10000, //< Default Max Timout is 10s
      start = new Date().getTime(),
      condition = false,
      interval = setInterval(function () {
        if ( (new Date().getTime() - start < maxtimeOutMillis) && !condition ) {
          // If not time-out yet and condition not yet fulfilled
          condition = (typeof(testFx) === "string" ? eval(testFx) : testFx()); //< defensive code
        } else {
          if(!condition) {
            // If condition still not fulfilled (timeout but condition is 'false')
            console.warn("'waitFor()' timeout");
            phantom.exit(1);
          } else {
            // Condition fulfilled (timeout and/or condition is 'true')
            console.warn("'waitFor()' finished in " + (new Date().getTime() - start) + "ms.");
            typeof(onReady) === "string" ? eval(onReady) : onReady(); //< Do what it's supposed to do once the condition is fulfilled
            clearInterval(interval); //< Stop this interval
          }
        }
      }, 100); //< repeat check every 250ms
};


if (phantom.args.length === 0 || phantom.args.length > 3) {
  console.warn('Usage: phantom-runner.js NAME URL');
  phantom.exit();
}

var page = new WebPage();
var opened = false;

// Route "console.warn()" calls from within the Page context to the main Phantom context (i.e. current "this")
page.onConsoleMessage = function(msg) {
  console.warn(msg);
};

// open phantom page
page.open(phantom.args[1], function (status) {
  if (status !== "success") {
    console.warn("Unable to access network");
    phantom.exit();
  } else {
    if (!opened) {
      console.warn("BEGIN: "+phantom.args[0]+"\n==============================");
      opened = true;
    }
    
    // begin polling for results
    waitFor(function() {
      // only proceed if the travis-results node exists
      return page.evaluate(function(){
        var el = document.getElementById('travis-results');
        if (el && el.innerHTML.length > 0) {
          return true;
        }
        return false;
      });
    }, function () {
      // test if we have failed
      var passed = page.evaluate(function () {
        var el = document.getElementById('travis-results'),
            result = el.innerHTML.replace(/^\s+/, '').replace(/\s+$/, '');
        return (result == 'pass') ? true : false;
      });
      console.warn((passed) ? 'pass' : 'fail');
      console.warn("END: "+phantom.args[0]+"\n==============================");
      phantom.exit((passed) ? 0 : 1);
    });
  }
});