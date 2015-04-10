// Canopy Header  
(function (Canopy, FFT) {

  Canopy.REV = '0.0.5';

  Canopy.MIN_SAMPLES_IN_VIEWPORT = 512;

  Canopy.STYLE = {
    editorWidth: 500,
    viewPadding: 20
  };

  // Import external dependency.
  Canopy.FFT = FFT;


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