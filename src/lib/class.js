// CLASS
( function( window ){
  // Stores whether the object is being initialized, and thus not
  // run the <init> function, or not.
  var initializing = false;
  var _Class = window.class;

  // The base Class implementation
  function Class(){};

  Class.noConflict = function() {
    window.Class = _Class;
    return Class;
  };

  // Create a new Class that inherits from this class
  Class.extend = function( fn ){
    // Keep a reference to the current prototye
    var base = this.prototype,
      // Invoke the function which will return an object literal used to define
      // the prototype. Additionally, pass in the base prototype, which will
      // allow instances to use the <base> keyword.
      props = fn( base ),
      // Stores the constructor's prototype
      proto,
      name;

       // The dummy class constructor
      function constructor(){
        if( !initializing && this.init ){
          // All construction is done in the init method
          this.init.apply( this, arguments );
          delete(this.init);
        }
      }

      // Instantiate a base class (but only create the instance, don't run the init function)
      // Make every <constructor> instance an instanceof <this> and of <constructor>
      initializing = true;
      proto = constructor.prototype = new this;
      initializing = false;

       // Copy the properties over onto the new prototype
      for( name in props ){
        if( props.hasOwnProperty( name ) ){
          proto[name] = props[name];
        }
      }

      // Enforce the constructor to be what we expect
      proto.constructor = constructor;

      // return a proxy object for accessing this as a superclass
      proto.createSuper = function( subclass ){
        var props = proto,
            iface = {},
            wrap = function(scope, fn) {
              return function() {
                return fn.apply(scope, arguments);
              };
            };
        for( name in props ){
          if( props.hasOwnProperty( name ) ){
            iface[name] = wrap(subclass, props[name]);
          }
        }
        return iface;
      };

      // Add <decorate> ability
      proto.decorate = function( /*decorator[s]*/ ){
        var i,
          len = arguments.length;

        for( i = 0 ; i < len; i += 1 ){
          arguments[i]( this, base );
        }
      };

       // Make this class extendable
      constructor.extend = Class.extend;

      return constructor;
  };

   //Export to Common JS Loader
  if( typeof module !== 'undefined' ){
    if( typeof module.setExports === 'function' ){
      module.setExports( Class );
    } else if( module.exports ){
      module.exports = Class;
    }
  } else {
    window.Class = Class;
  }

}( window ) );