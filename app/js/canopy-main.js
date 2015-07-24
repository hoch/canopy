/**
 * main.js
 * : main entry point.
 */

(function (Canopy) {

  'use strict';

  var eAppShell, eGistLoader, eWaveform, eMiniMap, eCoder;
  var eBtnPlay, eBtnLoop;

  Canopy.initialize = function () {

    // DOM element selectors.
    eAppShell = document.querySelector('#eAppShell');
    eGistLoader = document.querySelector('#eGistLoader');
    eWaveform = document.querySelector('#eWaveform');
    eMiniMap = document.querySelector('#eMiniMap');
    eCoder = document.querySelector('#eCoder');

    eBtnLoop = document.querySelector('#eBtnLoop');
    eBtnPlay = document.querySelector('#eBtnPlay');

    // Initial states.
    eBtnLoop.style.color = "gray";

    // Event handlers.
    Canopy.onOpenGistLoader = function () {
      eAppShell.openDrawer();
    };

    Canopy.onShowCoder = function () {
      eCoder.show();
    };

    Canopy.onPlay = function () {
      var region = eMiniMap.getRegion();
      if (region)
        Canopy.Audio.play(region.start, region.end);
    };

    Canopy.onStop = function () {
      Canopy.Audio.stop();
    };

    Canopy.onToggleLoop = function () {
      Canopy.Audio.toggleLoop();

      if (Canopy.Audio.loop)
        eBtnLoop.style.color = "orange";
      else
        eBtnLoop.style.color = "gray";
    };

    // Component-specific event handler.
    eGistLoader.onGistLoaded = function (gist) {
      eCoder.setCode(gist.code);
      eAppShell.closeDrawer();
    };

    eCoder.onRenderComplete = function (buffer) {
      eWaveform.setAudioBuffer(buffer);
      eMiniMap.setAudioBuffer(buffer);
      Canopy.Audio.setAudioBuffer(buffer);

      eWaveform.setViewRange(0, buffer.duration * 0.25);
      eMiniMap.setRegion(0, buffer.duration * 0.25);
    };

    // Set default codes.
    eCoder.setCode(
      '// Press RENDER button on the editor`s toolbar.\n' +
      '//\n' +
      '// @channels 1\n' +
      '// @duration 1.0\n\n' +
      'var osc = context.createOscillator();\n' +
      'var gain = context.createGain();\n' +
      'gain.gain.value = 0.5;\n' +
      'osc.connect(gain);\n' +
      'gain.connect(context.destination);\n' +
      'osc.start();'
    );

  }

  // Canopy message router.
  Canopy.router = {
    postMessage: function (id, type, data) {
      switch (id) {
        case 'spiral-minimap':
          eWaveform.setViewRange(data.start, data.end);
          break;
        case 'spiral-waveform':
          eMiniMap.setRegion(data.start, data.end);
          break;
        // case 'spiral-coder':
        //   eWaveform.setAudioBuffer(data.buffer);
        //   eMiniMap.setAudioBuffer(data.buffer);
        //   break;
        // case 'spiral-gistloader':
        //   eCoder.setCode(data.code);
        //   break;
        // case 'canopy:openGistLoader':
        //   eAppShell.openDrawer();
        //   break;
        // case 'canopy:showCoder':
        //   eCode.show();
        //   break;
        // case 'canopy:hideCoder':
        //   eCoder.hide();
        //   break;
      }
    }
  };

  // Entry point on WebComponentsReady.
  window.addEventListener('WebComponentsReady', function () {
    Canopy.initialize();
    eWaveform.setController(Canopy.router);
    eMiniMap.setController(Canopy.router);
    eCoder.setController(Canopy.router);
  });

})(Canopy);