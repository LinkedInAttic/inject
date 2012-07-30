equal(typeof(module.setExports), "function", "setExports available");

function add(val) {
  return val+1;
}

module.setExports(add);