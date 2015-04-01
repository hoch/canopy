// Canopy app Controller.
(function (Canopy) {

  var resizeTimer = 250;
  var resizeEvent;

  // Make sure the renderer is ready.
  Canopy.MiniMap = Canopy.createMiniMap('i-minimap');

  // System-wide render callback.
  Canopy.render = function (buffer) {
    Canopy.Audio.setBuffer(buffer);
    Canopy.MiniMap.setBuffer(buffer);
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
    Canopy.MiniMap.onResize();
    Canopy.Editor.onResize();
    // Canopy.View.onResize();
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
    Canopy.onResize();
    Canopy.Editor.render();
  });
  
})(Canopy);