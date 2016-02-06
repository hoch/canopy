(function (SpiralCoder) {

  'use strict';

  /**
   * @class CodeRunner
   * @description Internal task class.
   * @param {String} code
   * @param {Object} options { parent, duration, sampleRate, oncomplete }
   */
  function CodeRunner(code, setting) {
    this._oncomplete = setting.oncomplete;

    var header = 'var context = new OfflineAudioContext(' +
      setting.numChannels + ', ' +
      setting.sampleRate * setting.duration + ', ' +
      setting.sampleRate + ');\n';

    var footer = '\ncontext.startRendering().then(this._handleCompletion.bind(this));\n';

    this._task = new Function('', header + code + footer);
  }

  CodeRunner.prototype._handleCompletion = function (buffer) {
    this._oncomplete(buffer);
  };

  // Static method for CodeRunner.
  SpiralCoder.runCodeWithRenderSetting = function (code, setting) {
    var runner = new CodeRunner(code, setting);
    runner._task();
  };

})(SpiralCoder = {});
