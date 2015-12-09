(function (SpiralAudioGraph) {

  'use strict';

  // Stashing original context constructors.
  var AG = {
    AudioContext: AudioContext,
    OfflineAudioContext: OfflineAudioContext
  };

  // The current context being tracked.
  var currentContext = null;

  // Generate unique ID string of 16 digits hexadecimal.
  function _generateUID() {
    return 'xxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
      return v.toString(16);
    });
  }

  // Override object prototype with a specified function.
  function overridePrototype(prototype, methodName, func) {
    prototype['_' + methodName] = prototype[methodName];
    prototype[methodName] = func;
  }

  // Extension for (Offline)AudioContext.
  var contextExtension = {
    // Get unique ID.
    _getUID: {
      value: function () {
        // TODO: check duplicates.
        return _generateUID();
      }
    },

    // Dispatch spiral-* event to document.
    _dispatchEvent: {
      value: function (eventType, source, destination) {
        // If the action does not belong to the current context, do not fire
        // the event.
        if (source.context !== currentContext)
          return;

        document.dispatchEvent(new CustomEvent(
          'spiral-' + eventType, {
            detail: {
              source: source,
              destination: destination
            }
          }
        ));
      }
    },

    // Register a node in the context.
    _addNode: {
      value: function (node) {
        if (node.context !== currentContext)
          return;
        
        node._uid = this._getUID();
        this._nodes.push(node);
        this._dispatchEvent('created', node);
      }
    },

    // Register a connection between two nodes in the context.
    _addConnection: {
      value: function (source, destination) {

        // TODO: Take care duplicate connection for AudioParam.
        if (destination instanceof AudioParam) {
          // Add uid for destination AudioParam.
          destination._uid = destination.parentNode._uid + '.' + destination.paramName;
          this._nodes.push(destination);

          this._dispatchEvent('connected-param', source, destination);
          return;
        }

        // If source and destination are same, do nothing.
        if (source._uid === destination._uid)
          return;

        // If this is the first time, create the storage for the source.
        if (!this._connections.hasOwnProperty(source._uid))
          this._connections[source._uid] = [];

        // If the destination is already connected to the source, do nothing.
        if (this._connections[source._uid].indexOf(destination._uid) !== -1)
          return;

        this._connections[source._uid].push(destination._uid);
        this._dispatchEvent('connected', source, destination);
      }
    },

    // Remove a registered connection from the context.
    _removeConnection: {
      value: function (source, destination) {
        if (!this._connections.hasOwnProperty(source._uid))
          return;

        if (!destination) {
          this._connections[source._uid] = [];
          this._dispatchEvent('disconnected', source._uid);
          return;
        }

        var where = this._connections[source._uid].indexOf(destination._uid);
        if (where > -1) {
          this._connections[source._uid].splice(where, 1);
          this._dispatchEvent('disconnected', source, destination);
        }
      }
    },

    // Get AudioNode by UID.
    getNodeByUID: {
      value: function (uid) {
        for (var i = 0; i < this._nodes.length; i++) {
          if (this._nodes[i]._uid === uid)
            return this._nodes[i];
        }

        return null;
      }
    }
  };

  // Minitask for replacing factory method.
  function replaceFactory(prototype, method) {
    // Caching the original factory.
    prototype['_' + method] = prototype[method];

    // Override the factory method.
    prototype[method] = function () {
      var node = this['_' + method].apply(this, arguments);

      // Find AudioParam objects and assign the node reference.
      for (var property in node) {
        if (node[property] instanceof AudioParam) {
          node[property].parentNode = node;
          node[property].paramName = property;
        }
      }

      // Add the node to the context's storage and fire event.
      this._addNode(node);

      return node;
    };
  }

  // Wrap context constructor with additional features.
  function wrapContextForAudioNodeFactory(contextName) {
    var prototype = AG[contextName].prototype;

    // Override 'create*' factory methods.
    for (var method in prototype) {
      if (method.indexOf('create') === -1 || method.indexOf('_') > -1)
        continue;

      replaceFactory(prototype, method);
    }
  }

  overridePrototype(AudioNode.prototype, 'connect', function () {
    this._connect.apply(this, arguments);
    this.context._addConnection(this, arguments[0]);
  });

  overridePrototype(AudioNode.prototype, 'disconnect', function () {
    this._disconnect.apply(this, arguments);
    this.context._removeConnection(this, arguments[0]);
  });

  Object.defineProperties(AudioContext.prototype, contextExtension);
  wrapContextForAudioNodeFactory('AudioContext');

  // TODO: this is not necessary.
  // Object.defineProperties(OfflineAudioContext.prototype, contextExtension);
  // wrapContextForAudioNodeFactory('OfflineAudioContext');


  // Public methods.
  Object.defineProperties(SpiralAudioGraph, {

    // Start track a specified context.
    trackContext: {
      value: function (context) {
        currentContext = context;
        context._isTracked = true;
        context._nodes = [];
        context._connections = {};
        context._addNode(context.destination);
      }
    },

    getCurrentContext: {
      value: function () {
        return currentContext;
      }
    },

    // Release the context from tracking.
    releaseContext: {
      value: function () {
        if (!currentContext)
          return;

        currentContext._isTracked = null;
        currentContext._nodes = null;
        currentContext._connections = null;
        currentContext = null;
      }
    }

  });

})(SpiralAudioGraph = {});
