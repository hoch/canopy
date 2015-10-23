// Web Audio API hint
// @author hoch (hongchan.choi@gmail.com)

// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

(function (mod) {

  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);

})(function (CodeMirror) {

  var Pos = CodeMirror.Pos;

  function forEach(arr, f) {
    for (var i = 0, e = arr.length; i < e; ++i)
      f(arr[i]);
  }

  function arrayContains(arr, item) {
    if (!Array.prototype.indexOf) {
      var i = arr.length;
      while (i--) {
        if (arr[i] === item)
          return true;
      }

      return false;
    }

    return arr.indexOf(item) != -1;
  }

  function scriptHint(editor, keywords, getToken, options) {

    // Find the token at the cursor.
    var cur = editor.getCursor();
    var token = getToken(editor, cur);

    // Exit with invalid token, such as a null.
    if (/\b(?:comment|number|operator|null)\b/.test(token.type))
      return;

    token.state = CodeMirror.innerMode(editor.getMode(), token.state).state;

    // If it's not a 'word-style' token, ignore the token.
    if (!/^[\w$_'"]*$/.test(token.string)) {
      token = {
        start: cur.ch,
        end: cur.ch,
        string: '',
        state: token.state,
        type: token.string == "." ? "property" : null
      };
    } else if (token.end > cur.ch) {
      token.end = cur.ch;
      token.string = token.string.slice(0, cur.ch - token.start);
    }

    var tprop = token;

    // If it is a property, find out what it is a property of.
    while (tprop.type == "property") {
      tprop = getToken(editor, Pos(cur.line, tprop.start));

      if (tprop.string != ".")
        return;

      tprop = getToken(editor, Pos(cur.line, tprop.start));

      if (!context)
        var context = [];

      context.push(tprop);
    }

    return {
      list: getCompletions(token, context, keywords, options),
      from: Pos(cur.line, token.start),
      to: Pos(cur.line, token.end)
    };
  }

  function webAudioAPIHint(editor, options) {
    return scriptHint(
      editor,
      WEBAUDIOAPI_KEYWORDS,
      function (e, cur) { return e.getTokenAt(cur); },
      options
    );
  }

  CodeMirror.registerHelper("hint", "webaudioapi", webAudioAPIHint);

  var stringProps = ("charAt charCodeAt indexOf lastIndexOf substring substr slice trim trimLeft trimRight " +
                     "toUpperCase toLowerCase split concat match replace search").split(" ");
  var arrayProps = ("length concat join splice push pop shift unshift slice reverse sort indexOf " +
                    "lastIndexOf every some filter forEach map reduce reduceRight ").split(" ");
  var funcProps = "prototype apply call bind".split(" ");
  
  function getCompletions(token, context, keywords, options) {
    
    var global = options && options.globalScope || window;
    var found = [];
    var start = token.string;

    function maybeAdd(str) {
      if (str.lastIndexOf(start, 0) == 0 && !arrayContains(found, str))
        found.push(str);
    }

    function gatherCompletions(obj) {
      
      if (typeof obj == "string")
        forEach(stringProps, maybeAdd);
      else if (obj instanceof Array)
        forEach(arrayProps, maybeAdd);
      else if (obj instanceof Function)
        forEach(funcProps, maybeAdd);
      
      for (var name in obj)
        maybeAdd(name);
    }

    if (context && context.length) {

      // If this is a property, see if it belongs to some object we can
      // find in the current environment.
      var obj = context.pop();
      var base;

      if (obj.type && obj.type.indexOf("variable") === 0) {
        if (options && options.additionalContext)
          base = options.additionalContext[obj.string];
        if (!options || options.useGlobalScope !== false)
          base = base || global[obj.string];
      } else if (obj.type == "string") {
        base = "";
      } else if (obj.type == "atom") {
        base = 1;
      } else if (obj.type == "function") {
        if (global.jQuery != null && (obj.string == '$' || obj.string == 'jQuery') &&
            (typeof global.jQuery == 'function'))
          base = global.jQuery();
        else if (global._ != null && (obj.string == '_') && (typeof global._ == 'function'))
          base = global._();
      }

      while (base != null && context.length)
        base = base[context.pop().string];

      if (base != null)
        gatherCompletions(base);

      forEach(keywords, maybeAdd);

    } else {

      // If not, just look in the local scope.
      for (var v = token.state.localVars; v; v = v.next)
        maybeAdd(v.name);

      forEach(keywords, maybeAdd);
    }

    return found;
  }

  // Web Audio API keywords.
  var WEBAUDIOAPI_KEYWORDS = ("AudioContext suspend resume close createBuffer createBufferSource " +
    "createMediaElementSource createMediaStreamSource createMediaStreamDestination createAnalyser " +
    "createGain createDelay createBiquadFilter createWaveShaper createPanner createStereoPanner " +
    "createConvolver createChannelSplitter createChannelMerger createDynamicsCompressor " +
    "createOscillator createPeriodicWave decodeAudioData OfflineAudioContext startRendering " +
    "setValueAtTime linearRampToValueAtTime exponentialRampToValueAtTime setTargetAtTime " +
    "setValueCurveAtTime cancelScheduledValues getChannelData copyFromChannel copyToChannel " +
    "connect disconnect start stop setPosition setOrientation setVelocity setPosition setOrientation " +
    "setVelocity getFloatFrequencyData getByteFrequencyData getFloatTimeDomainData getByteTimeDomainData " +
    "getFrequencyResponse start stop setPeriodicWave" +
    "attack buffer channelCount channelCountMode channelInterpretation " +
    "coneInnerAngle coneOuterAngle coneOuterGain context currentTime curve custom defaultValue destination " +
    "detune distanceModel dopplerFactor duration fftSize frequency frequencyBinCount gain " +
    "knee listener loop loopEnd loopStart maxChannelCount maxDecibels " +
    "maxDistance minDecibels normalize numberOfInputs numberOfOutputs oncomplete onended " +
    "onstatechange oversample pan panningModel playbackRate Q ratio reduction refDistance " +
    "release renderedBuffer rolloffFactor sampleRate smoothingTimeConstant " +
    "speedOfSound stream threshold type value " +
    "'sawtooth' 'sine' 'square' '2x' '4x' 'none' 'allpass' 'triangle' 'lowpass' 'lowshelf' 'peaking' " +
    "'highpass' 'highshelf' 'clamped-max' 'max' 'bandpass' 'explicit' 'discrete' 'notch' 'speakers' " +
    "case continue default do else false for function " +
    "if in instanceof new null return switch true try typeof var while").split(" ");

  // var WEBAUDIOAPI_ENUMS = ("sawtooth sine square 2x 4x none allpass triangle lowpass lowshelf peaking " +
  //   "highpass highshelf clamped-max max bandpass explicit discrete notch speakers").split(" ");

});
