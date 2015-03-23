// Canopy app Controller.
(function (Canopy) {

  var resizeTimer = 250;
  var resizeEvent;

  function onWindowResize() {
    Canopy.Editor.onResize();
    Canopy.View.onResize();
    Canopy.ViewSpecgram.onResize();  
  }

  // Global event handlers.
  window.addEventListener('resize', function () {
    clearTimeout(resizeEvent);
    setTimeout(onWindowResize, resizeTimer);
  });

  // Buttons:
  // Attach 'runCode' method to the buttons
  Canopy.renderButtonDOM.onclick = Canopy.Editor.runCode;
  Canopy.playButtonDOM.onclick = Canopy.Audio.play;

  
  
  // Boot-up operations. (wait for Polymer to load.)
  window.addEventListener('polymer-ready', function(e) {
    onWindowResize();
    Canopy.Editor.runCode();
  });
  
})(Canopy);