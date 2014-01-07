var test = require('test');
aVeryUnlikelyIdentifier = function () {};
test.assert(typeof aVeryUnlikelyIdentifier != "undefined", 'free assignment bound in local scope');
