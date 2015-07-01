// Canopy Editor module
(function (Canopy, CodeMirror) {

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
   * @param {Object} domIds { editor, renderButton, inputSettings, console }
   */
  function Editor(domIds, controller) {
    this.editorDOM = document.getElementById(domIds.editor);
    this.renderButtonDOM = document.getElementById(domIds.renderButton);
    this.replayButtonDOM = document.getElementById(domIds.replayButton);
    this.numChannelsInputDOM = document.getElementById(domIds.numChannelsInput);
    this.durationInputDOM = document.getElementById(domIds.durationInput);
    this.sampleRateInputDOM = document.getElementById(domIds.sampleRateInput);
    // this.consoleDOM = document.getElementById(domIds.console);

    this.numChannelsInputDecoDOM = document.getElementById(domIds.numChannelsInput + '-deco');
    this.durationInputDecoDOM = document.getElementById(domIds.durationInput + '-deco');
    this.sampleRateInputDecoDOM = document.getElementById(domIds.sampleRateInput + '-deco');    

    this.controller = controller;
    this.isBufferRendered = false;

    this.renderNumChannels = DEFAULT_RENDER_OPTIONS.numChannels;
    this.renderDuration = DEFAULT_RENDER_OPTIONS.duration;
    this.renderSampleRate = DEFAULT_RENDER_OPTIONS.sampleRate;

    this.numChannelsInputDOM.value = DEFAULT_RENDER_OPTIONS.numChannels;
    this.durationInputDOM.value = DEFAULT_RENDER_OPTIONS.duration;
    this.sampleRateInputDOM.value = DEFAULT_RENDER_OPTIONS.sampleRate;

    this.editor = CodeMirror(this.editorDOM, EDITOR_OPTIONS);

    this.editor.on('change', this.markAsChanged.bind(this));

    this.numChannelsInputDOM.onchange = this.markAsChanged.bind(this);
    this.durationInputDOM.onchange = this.markAsChanged.bind(this);
    this.sampleRateInputDOM.onchange = this.markAsChanged.bind(this);

    this.renderButtonDOM.onclick = this.render.bind(this);
    this.replayButtonDOM.onclick = this.replay.bind(this);

    this.replayButtonDOM.setAttribute('disabled', true);
  }

  Editor.prototype.setCodeString = function (codeStr) {
    this.editor.setValue(codeStr);
  };

  Editor.prototype.markAsRendered = function () {
    if (!this.isBufferRendered) {
      this.renderButtonDOM.setAttribute('disabled', true);
      this.replayButtonDOM.removeAttribute('disabled');
      this.isBufferRendered = true;
    }
  };

  Editor.prototype.validateRenderSettings = function () {

    var numChannels = this.numChannelsInputDOM.value;
    var duration = this.durationInputDOM.value;
    var sampleRate = this.sampleRateInputDOM.value;

    if (numChannels < RENDER_OPTIONS_RANGE.minNumChannels || 
      numChannels > RENDER_OPTIONS_RANGE.maxNumChannels) {
      this.numChannelsInputDecoDOM.error = 'The number of channels should be between 1 ~ 8. ';
      this.numChannelsInputDecoDOM.isInvalid = true;
      return false;
    } else {
      this.numChannelsInputDecoDOM.isInvalid = false;
      this.renderNumChannels = numChannels;
    }

    if (duration < RENDER_OPTIONS_RANGE.minDuration || 
      duration > RENDER_OPTIONS_RANGE.maxDuration) {
      this.durationInputDecoDOM.error = 'The duration should be between 0.25 ~ 10 seconds.';
      this.durationInputDecoDOM.isInvalid = true;
      return false;
    } else {
      this.durationInputDecoDOM.isInvalid = false;
      this.renderDuration = duration;
    }

    if (sampleRate < RENDER_OPTIONS_RANGE.minSampleRate || 
      sampleRate > RENDER_OPTIONS_RANGE.maxSampleRate) {
      this.sampleRateInputDecoDOM.error = 'The sample rate should be between 3000 ~ 192000 Hz.';
      this.sampleRateInputDecoDOM.isInvalid = true;
      return false;
    } else {
      this.sampleRateInputDecoDOM.isInvalid = false;
      this.renderSampleRate = sampleRate;  
    }
    
  };

  Editor.prototype.markAsChanged = function () {
    this.validateRenderSettings();
    if (this.isBufferRendered) {
      this.renderButtonDOM.removeAttribute('disabled');
      this.isBufferRendered = false;
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
      new RenderTask(options);
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
    // TO FIX: Red flicker on console DIV.
    console.log(message);
  };

  Editor.prototype.onResize = function () {
    var height = window.innerHeight;
    height -= (STYLE.titleBarHeight + STYLE.renderOptionHeight);
    height -= 20; // top-bottom padding 10px.
    this.editor.setSize('100%', height);
  };


  /**
   * @class RenderTask
   * @description Internal task class.
   * @param {Object} options { parentEditor, duration, sampleRate, code }
   */
  function RenderTask(options) {
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

  RenderTask.prototype.onComplete = function (event) {
    this.parentEditor.onRenderComplete(event.renderedBuffer);
  };


  /**
   * Editor Factory.
   */
  Canopy.createEditor = function (domIds) {
    return new Editor(domIds, Canopy);
  };

})(Canopy, CodeMirror);