// assign things to the global context
// export the interface publicly
context.Inject = Inject;

// commonJS
context.require = Inject.require;
context.require.ensure = Inject.ensure;
context.require.run = Inject.run;

// AMD
context.define = Inject.define;
context.define.amd = true;
context.require.toUrl = Analyzer.toUrl;