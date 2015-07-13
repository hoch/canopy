/**
 * canopy.js
 *
 * Code editor + OfflineAudioContext renderer.
 */

(function (Canopy) {

  var STYLE = {
    width: 500,
    titleBarHeight: 64,
    renderOptionHeight: 0,
    consoleHeight: 128
  };

  // Options for CodeMirror editor.
  var EDITOR_OPTIONS = {
    mode: 'javascript',
    lineWrapping: true,
    value: '',
    theme: 'elegant'
  };

  var RENDER_OPTIONS_RANGE = {
    minSampleRate: 3000,
    maxSampleRate: 192000,
    minDuration: 0.25,
    maxDuration: 10.00,
    minNumChannels: 1,
    maxNumChannels: 8
  };

  var DEFAULT_RENDER_OPTIONS = {
    sampleRate: 44100,
    duration: 3,
    numChannels: 2
  };

  /**
   * @class Editor
   */
  function Editor(domIds, controller) {
    this.editorDOM = document.getElementById(domIds.editor);
    this.renderButtonDOM = document.getElementById(domIds.renderButton);

    this.numChannelsInputDOM = document.getElementById(domIds.numChannelsInput);
    this.durationInputDOM = document.getElementById(domIds.durationInput);
    this.sampleRateInputDOM = document.getElementById(domIds.sampleRateInput);

    this.editor = CodeMirror(this.editorDOM, EDITOR_OPTIONS);

    this.numChannelsInputContainerDOM = document.getElementById(domIds.numChannelsInput + '-cont');
    this.durationInputContainerDOM = document.getElementById(domIds.durationInput + '-cont');
    this.sampleRateInputContainerDOM = document.getElementById(domIds.sampleRateInput + '-cont');    

    this.numChannelsInputDOM.onchange = this.markAsChanged.bind(this);
    this.durationInputDOM.onchange = this.markAsChanged.bind(this);
    this.sampleRateInputDOM.onchange = this.markAsChanged.bind(this);
    this.renderButtonDOM.onclick = this.render.bind(this);
    this.editor.on('change', this.markAsChanged.bind(this));
  }

  Editor.prototype.setCodeString = function (codeStr) {
    this.editor.setValue(codeStr);
  };

  Editor.prototype.markAsRendered = function () {
    if (!this.isBufferRendered) {
      this.renderButtonDOM.setAttribute('disabled', true);
      this.isBufferRendered = true;
    }
  };

  Editor.prototype.markAsChanged = function () {
    this.validateRenderSettings();
    if (this.isBufferRendered) {
      this.renderButtonDOM.removeAttribute('disabled');
      this.isBufferRendered = false;
    }
  };

  Editor.prototype.validateRenderSettings = function () {

    var numChannels = this.numChannelsInputDOM.value;
    var duration = this.durationInputDOM.value;
    var sampleRate = this.sampleRateInputDOM.value;

    if (numChannels < RENDER_OPTIONS_RANGE.minNumChannels || 
      numChannels > RENDER_OPTIONS_RANGE.maxNumChannels) {
      // this.numChannelsInputContainerDOM.error = 'The number of channels should be between 1 ~ 8. ';
      this.numChannelsInputContainerDOM.invalid = true;
      return false;
    } else {
      this.numChannelsInputContainerDOM.invalid = false;
      this.renderNumChannels = numChannels;
    }

    if (duration < RENDER_OPTIONS_RANGE.minDuration || 
      duration > RENDER_OPTIONS_RANGE.maxDuration) {
      this.durationInputContainerDOM.error = 'The duration should be between 0.25 ~ 10 seconds.';
      this.durationInputContainerDOM.invalid = true;
      return false;
    } else {
      this.durationInputContainerDOM.invalid = false;
      this.renderDuration = duration;
    }

    if (sampleRate < RENDER_OPTIONS_RANGE.minSampleRate || 
      sampleRate > RENDER_OPTIONS_RANGE.maxSampleRate) {
      this.sampleRateInputContainerDOM.error = 'The sample rate should be between 3000 ~ 192000 Hz.';
      this.sampleRateInputContainerDOM.invalid = true;
      return false;
    } else {
      this.sampleRateInputContainerDOM.invalid = false;
      this.renderSampleRate = sampleRate;  
    }
    
  };

  Editor.prototype.render = function () {
    var options = {
      parentEditor: this,
      sampleRate: this.renderSampleRate,
      duration: this.renderDuration,
      numChannels: this.renderNumChannels,
      code: this.editor.getValue()
    };

    try {
      new AudioRenderer(options);
    } catch (error) {
      var message = '[' + error.name + '] ' + error.message;
      this.logError(message);
      console.log(error.stack, message);
    }

    this.markAsRendered();
  };

  Editor.prototype.replay = function () {
    this.controller.notify('editor', 'replay', null);
  };

  Editor.prototype.onRenderComplete = function (renderedBuffer) {
    this.controller.notify('editor', 'render-complete', { buffer: renderedBuffer });
  };

  Editor.prototype.logError = function (message) {
    // TODO: paper-toast
    // console.log(message);
  };


  /**
   * @class RenderTask
   * @description Internal task class.
   * @param {Object} options { parentEditor, duration, sampleRate, code }
   */
  function AudioRenderer(options) {
    this.parentEditor = options.parentEditor;

    var header = 'var context = new OfflineAudioContext(' + 
      options.numChannels + ', ' +
      options.sampleRate * options.duration + ', ' +
      options.sampleRate + ');';

    var footer = 'context.oncomplete = this.onComplete.bind(this);' +
      'context.startRendering();';

    // NOTE: be careful with Function. It is same with 'eval()'.
    this.task = new Function('', header + options.code + footer);

    this.task();
  }

  AudioRenderer.prototype.onComplete = function (event) {
    this.parentEditor.onRenderComplete(event.renderedBuffer);
  };


  /**
   * Editor Factory.
   */
  Canopy.createEditor = function (domIds) {
    return new Editor(domIds, Canopy);
  };


})(Canopy = {});