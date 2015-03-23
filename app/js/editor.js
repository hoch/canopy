var SNIPPETS = [
  {
    name: 'hello sine!',
    code: 'var osc1 = context.createOscillator();\nosc1.frequency.value = 1000;\nosc1.connect(context.destination);\nosc1.start();'
  }, {
    name: 'simple FM',
    code: 'var osc1 = context.createOscillator();\nvar modGain = context.createGain();\nvar osc2 = context.createOscillator();\nosc1.connect(modGain);\nmodGain.connect(osc2.frequency);\nosc2.connect(context.destination);\nosc1.frequency.value = 60;\nmodGain.gain.value = 335;\nosc2.frequency.value = 440;\nosc1.start();\nosc2.start();\n'
  }, {
    name: 'sine sweep',
    code: 'var osc1 = context.createOscillator();\nvar modGain = context.createGain();\nvar osc2 = context.createOscillator();\nosc1.connect(modGain);\nmodGain.connect(osc2.frequency);\nosc2.connect(context.destination);\nosc1.frequency.value = 60;\nmodGain.gain.value = 12;\nosc2.frequency.setValueAtTime(0, 0);\nosc2.frequency.linearRampToValueAtTime(22050, 2);\nosc1.start();\nosc2.start();\n'
  }
];


// Canopy Editor module
(function (Canopy) {

  // Canopy.Editor
  //
  
  var m_codeMirror = CodeMirror(Canopy.editorDOM, {
    value: SNIPPETS[2].code,
    mode: 'javascript',
    // lineNumbers: true,
    lineWrapping: true
  });

  var m_isBufferRendered = false;
  var m_renderDuration = 1;

  Canopy.Editor = {};

  Canopy.Editor.markAsRendered = function () {
    if (!m_isBufferRendered) {
      Canopy.renderButtonDOM.setAttribute('disabled', true);
      m_isBufferRendered = true;  
    }
  };

  Canopy.Editor.markAsChanged = function () {
    if (m_isBufferRendered) {
      Canopy.renderButtonDOM.removeAttribute('disabled');
      m_isBufferRendered = false;  
    }
  };

  Canopy.Editor.runCode = function () {
    m_renderDuration = Canopy.sliderDOM.immediateValue;
    Canopy.Editor.markAsRendered();
    new Task(m_codeMirror.getValue()).run();
  };

  Canopy.Editor.onResize = function () {
    Canopy.editorDOM.style.height = window.innerHeight - 
      Canopy.config.titleBarHeight - Canopy.config.renderOptionsHeight;
  };


  // Task internal class.
  // Dependencies: Canopy.View, Canopy.Audio
  function Task(str) {
    this.injectTaskFromString(str);
  }

  Task.prototype.injectTaskFromString = function (str) {
    var header = 'var context = new OfflineAudioContext(2, 44100 * ' +
      m_renderDuration + ', 44100);';
    var footer = 'context.oncomplete = this.onRenderComplete;' + 
      'context.startRendering();';
    
    // NOTE: be careful with Function. It is same with 'eval()'.
    this.task = new Function('', header + str + footer);
  };

  Task.prototype.run = function () {
    try {
      this.task();
    } catch (error) {
      var message = '[' + error.name + '] ' + error.message;
      // Canopy.consoleDOM.textContent = '(!) Canopy: ' + message;
      console.log(error.stack);
    }
  };

  Task.prototype.onRenderComplete = function (event) {
    var buffer = event.renderedBuffer;
    Canopy.View.setBuffer(buffer);
    Canopy.Audio.setBuffer(buffer);
    Canopy.Audio.play();
  };

  // Other event handlers.
  m_codeMirror.on('change', function () {
    Canopy.Editor.markAsChanged();
  });

  // Sliders:
  Canopy.sliderDOM.onchange = function () {
    Canopy.Editor.markAsChanged();
  };


})(Canopy);