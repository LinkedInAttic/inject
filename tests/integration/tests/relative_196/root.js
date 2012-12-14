require("/src/requirer");
ok(true, 'root');

// all dependencies should be loaded. Tree dictates one-more-require goes first
// and bubbles back up to root.js at the end of the execution steps
start();