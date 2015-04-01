// Canopy Editor module
(function (Canopy, CodeMirror) {

  var STYLE = {
    width: 500,
    titleBarHeight: 64,
    renderOptionHeight: 70,
    consoleHeight: 64
  };

  // Options for CodeMirror editor.
  var EDITOR_OPTIONS = {
    mode: 'javascript',
    lineWrapping: true,
    value: Canopy.Snippets[1].code,
    theme: 'elegant'
  };


  /**
   * @class Editor
   * @param {Object} domIds { editor, renderButton, durationSlider, console }
   */
  function Editor(domIds, CanopyRenderCallback) {
    this.editorDOM = document.getElementById(domIds.editor);
    this.renderButtonDOM = document.getElementById(domIds.renderButton);
    this.durationSliderDOM = document.getElementById(domIds.durationSlider);
    this.consoleDOM = document.getElementById(domIds.console);

    this.isBufferRendered = false;
    this.renderDuration = 2;
    this.renderCallback = CanopyRenderCallback;
    
    this.editor = CodeMirror(this.editorDOM, EDITOR_OPTIONS);
    
    this.editor.on('change', this.markAsChanged.bind(this));
    this.durationSliderDOM.onchange = this.markAsChanged.bind(this);
    this.renderButtonDOM.onclick = this.render.bind(this);
  }

  Editor.prototype.markAsRendered = function () {
    if (!this.isBufferRendered) {
      this.renderButtonDOM.setAttribute('disabled', true);
      this.isBufferRendered = true;  
    }
  };

  Editor.prototype.markAsChanged = function () {
    if (this.isBufferRendered) {
      this.renderButtonDOM.removeAttribute('disabled');
      this.isBufferRendered = false;  
    }
  };

  Editor.prototype.render = function () {
    var options = {
      errorCallback: this.logError,
      renderCallback: this.renderCallback,
      sampleRate: 44100,
      duration: this.durationSliderDOM.immediateValue,
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

  Editor.prototype.logError = function (message) {
    // TO FIX: Red flicker on console DIV.
    this.consoleDOM.textContent = message;
    console.log(message);
  };

  Editor.prototype.onResize = function () {
    var height = window.innerHeight;
    height -= (STYLE.titleBarHeight + STYLE.renderOptionHeight + STYLE.consoleHeight);
    height -= 20; // top-bottom padding 10px.
    this.editor.setSize('100%', height);

    this.consoleDOM.style.height = STYLE.consoleHeight;
  };


  /**
   * @class RenderTask
   * @description Internal task class.
   * @param {String} codeString Code string.
   * @param {Object} options { duration, sampleRate, renderCallback }
   */
  function RenderTask(options) {
    this.errorCallback = options.errorCallback;
    this.renderCallback = options.renderCallback;

    var header = 'var context = new OfflineAudioContext(2, ' +
      options.sampleRate * options.duration + ', ' +
      options.sampleRate + ');';

    var footer = 'context.oncomplete = this.onComplete.bind(this);' + 
      'context.startRendering();';
    
    // NOTE: be careful with Function. It is same with 'eval()'.
    this.task = new Function('', header + options.code + footer);

    this.task();
  }

  RenderTask.prototype.onComplete = function (event) {
    this.renderCallback(event.renderedBuffer);
  };


  /**
   * Editor Factory.
   * @param  {[type]} domIds         [description]
   * @param  {[type]} CanopyRenderer [description]
   * @return {[type]}                [description]
   */
  Canopy.createEditor = function (domIds, CanopyRenderer) {
    return new Editor(domIds, CanopyRenderer);
  };

})(Canopy, CodeMirror);