// Canopy Header  
(function (Canopy, FFT) {

  Canopy.REV = '0.0.4';

  Canopy.STYLE = {
    editorWidth: 500,
    viewPadding: 20
  };

  // Import external dependency.
  Canopy.FFT = FFT;

  // Code snippets.
  Canopy.Snippets = [
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


  /**
   * Canopy Real-time audio engine.
   */
  Canopy.Audio = {};

  var context = new AudioContext();
  var masterGain = context.createGain();
  masterGain.connect(context.destination);

  var lastRenderedBuffer = null;
  var loop = false;

  Canopy.Audio.play = function () {
    if (!lastRenderedBuffer) {
      console.log('ERROR: Invalid buffer.');
      return;
    }
    var source = context.createBufferSource();
    source.buffer = lastRenderedBuffer;
    source.connect(masterGain);
    source.start();
  };

  Canopy.Audio.setBuffer = function (buffer) {
    lastRenderedBuffer = buffer;
    Canopy.Audio.play();
  };

})(Canopy = {}, FFT);