// Dependencies
// 
// Namespace
// Audio: Namespace
// View: Namespace, Audio
// Editor: Namespace, Audio, View
// App: Namespace, Audio, View, Editor


// Namespace Canopy
var Canopy = {
  'REV': '0.0.3'
};

(function (Canopy, FFT) {

  // Import external dependency.
  Canopy.FFT = FFT;

  // UI DOM handles
  Canopy.renderButtonDOM = document.querySelector('#i-render-btn');
  Canopy.editorDOM = document.querySelector('#i-editor');
  Canopy.consoleDOM = document.querySelector('#i-editor-console');
  
  Canopy.waveformDOM = document.querySelector('#i-waveform');
  Canopy.spectrogramDOM = document.querySelector('#i-specgram');
  
  // Canopy.statDOM = document.querySelector('#i-stat');
  // Canopy.filebrowserDOM = document.querySelector('#i-filebrowser');
  
  Canopy.config = {
    titleBarHeight: 64,
    editorWidth: 500,
    consoleHeight: 200
  };

})(Canopy, FFT);


