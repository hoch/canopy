(function (SpiralCoder) {

  'use strict';

  /**
   * @class CodeRenderer
   * @description Internal task class.
   * @param {String} code
   * @param {Object} options { parent, duration, sampleRate }
   */
  function CodeRenderer(code, options) {
    this.onComplete = options.onComplete;

    // Extract parameters in the header comment.
    var sampleRate = /\/\/\s*@sampleRate\s*(\S+)/g.exec(code);
    var numChannels = /\/\/\s*@channels\s*(\S+)/g.exec(code);
    var duration = /\/\/\s*@duration\s*(\S+)/g.exec(code);

    // Settings in code override the setting from the control panel.
    if (sampleRate)
      options.sampleRate = Math.max(3000, Math.min(192000, Number(sampleRate[1])));

    if (numChannels)
      options.numChannels = Math.max(1, Math.min(32, Number(numChannels[1])));
    
    if (duration)
      options.duration = Math.max(0.5, Math.min(10, Number(duration[1])));

    var header = 'var context = new OfflineAudioContext(' + 
      options.numChannels + ', ' +
      options.sampleRate * options.duration + ', ' +
      options.sampleRate + ');\n';

    var footer = 'context.startRendering().then(this._onComplete.bind(this));';

    // NOTE: be careful with Function. It is same with 'eval()'.
    this.task = new Function('', header + code + footer);

    this.task();
  }

  CodeRenderer.prototype._onComplete = function (buffer) {
    this.onComplete(buffer);
  };

  // Editor Factory.
  SpiralCoder.renderCodeWithOptions = function (code, options) {
    return new CodeRenderer(code, options);
  };

})(SpiralCoder = {});
