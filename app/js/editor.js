var SNIPPETS = [
  {
    name: 'hello sine!',
    code: 'var osc1 = context.createOscillator();\nosc1.frequency.value = 1000;\nosc1.connect(context.destination);\nosc1.start();'
  }, {
    name: 'simple FM',
    code: 'var osc1 = context.createOscillator();\nvar modGain = context.createGain();\nvar osc2 = context.createOscillator();\nosc1.connect(modGain);\nmodGain.connect(osc2.frequency);\nosc2.connect(context.destination);\nosc1.frequency.value = 60;\nmodGain.gain.value = 335;\nosc2.frequency.value = 440;\nosc1.start();\nosc2.start();\n'
  }
];


// Canopy Editor module
(function (Canopy) {

  Canopy.Editor = {};

  var codeMirror = CodeMirror(Canopy.editorDOM, {
    value: SNIPPETS[1].code,
    mode: 'javascript'
  });

  function Task(str) {
    this.injectTaskFromString(str);
  }

  Task.prototype.injectTaskFromString = function (str) {
    var header = 'var context = new OfflineAudioContext(2, 44100 * 2, 44100);';
    // var footer = 'context.startRendering().then(this.onRenderComplete);';
    var footer = 'context.oncomplete = this.onRenderComplete; context.startRendering();';
    
    // NOTE: be careful with Function. It is same with 'eval()'.
    this.task = new Function('', header + str + footer);
  };

  Task.prototype.run = function () {
    try {
      this.task();
    } catch (error) {
      var message = '[' + error.name + '] ' + error.message;
      Canopy.consoleDOM.textContent = '(!) Canopy: ' + message;
      console.log(error.stack);
    }
  };

  Task.prototype.onRenderComplete = function (event) {
    var buffer = event.renderedBuffer;
    Canopy.View.setBuffer(buffer);
    Canopy.Audio.playRenderedBuffer(buffer);
  };

  Canopy.Editor.runCode = function () {
    new Task(codeMirror.getValue()).run();
  };

  // Attach 'runCode' method to the buttons
  Canopy.renderButtonDOM.onclick = Canopy.Editor.runCode;

})(Canopy);