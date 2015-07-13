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

    var header = 'var context = new OfflineAudioContext(' + 
      options.numChannels + ', ' +
      options.sampleRate * options.duration + ', ' +
      options.sampleRate + ');';

    var footer = 'context.oncomplete = this._onComplete.bind(this);' +
      'context.startRendering();';

    // NOTE: be careful with Function. It is same with 'eval()'.
    this.task = new Function('', header + code + footer);

    this.task();
  }

  CodeRenderer.prototype._onComplete = function (event) {
    this.onComplete(event.renderedBuffer);
  };

  // Editor Factory.
  SpiralCoder.renderCodeWithOptions = function (code, options) {
    return new CodeRenderer(code, options);
  };

})(SpiralCoder = {});