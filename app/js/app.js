// Canopy app Controller.
(function (Canopy) {

  var resizeTimer = 250;
  var resizeEvent;

  // Make sure the renderer is ready.
  var Waveform = Canopy.createWaveform('i-waveform');
  var MiniMap = Canopy.createMiniMap('i-minimap');

  // System-wide router.
  Canopy.notify = function (moduleId, action, data) {
    
    switch (moduleId) {
      case 'minimap':
        if (action === 'viewport-change')
          Waveform.setViewPort(data.start, data.end);
        break;
      case 'waveform':
        if (action === 'viewport-change')
          MiniMap.setRegion(data.start, data.end);
        break;
    }

  };

  // System-wide render callback.
  Canopy.render = function (buffer) {
    Canopy.Audio.setBuffer(buffer);
    MiniMap.setBuffer(buffer);
    Waveform.setBuffer(buffer);
  };
  
  // Construction.
  Canopy.Editor = Canopy.createEditor({
    editor: 'i-editor',
    renderButton: 'i-render-button',
    durationSlider: 'i-slider-duration',
    console: 'i-console'
  }, Canopy.render);

  // Canopy.MiniMap = Canopy.createMiniMap('i-minimap');



  Canopy.onResize = function () {
    MiniMap.onResize();
    Waveform.onResize();
    Canopy.Editor.onResize();
    // Canopy.ViewSpecgram.onResize();
  };

  // Global event handlers.
  window.addEventListener('resize', function () {
    clearTimeout(resizeEvent);
    setTimeout(Canopy.onResize, resizeTimer);
  });

  // Buttons:
  // Canopy.playButtonDOM.onclick = Canopy.Audio.play;

  // Boot-up operations. (wait for Polymer to load.)
  window.addEventListener('polymer-ready', function(e) {
    Canopy.Editor.render();
    Canopy.onResize();
  });
  
})(Canopy);