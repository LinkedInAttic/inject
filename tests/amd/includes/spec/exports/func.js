define("func", ["require", "exports", "module"], function(require, exports, module) {
    module.setExports(function(name) {
        return "hello " + name;
    });
});
