// Canopy app Controller.
(function (Canopy) {

  var resizeTimer = 100;
  var resizeEvent;

  // Create modules.
  var Specgram = Canopy.createSpecgram('i-specgram');
  var WaveformRenderer = document.getElementById('wf-renderer');
  var MiniMap = Canopy.createMiniMap('i-minimap');
  var Editor = Canopy.createEditor({
    editor: 'i-editor',
    replayButton: 'i-replay-button',
    renderButton: 'i-render-button',
    sampleRateInput: 'i-setting-samplerate',
    durationInput: 'i-setting-duration',
    numChannelsInput: 'i-setting-numchannels',
    console: 'i-console'
  });

  // System-wide router.
  Canopy.notify = function (moduleId, action, data) {    
    switch (moduleId) {
      case 'minimap':
        if (action === 'viewport-change')
          WaveformRenderer.setViewPort(data.start, data.end);
        break;
      case 'waveform':
        if (action === 'viewport-change')
          MiniMap.setRange(data.start, data.end);
        break;
      case 'editor':
        if (action === 'render-complete') {
          Canopy.Audio.setBuffer(data.buffer);
          MiniMap.setBuffer(data.buffer);
          WaveformRenderer.setBuffer(data.buffer);
          Specgram.setBuffer(data.buffer);
        }
        if (action === 'replay') {
          Canopy.Audio.play();
        }
        break;
    }
  };

  Canopy.onResize = function () {
    // console.log('resized');
    Editor.onResize();
    MiniMap.onResize();
    WaveformRenderer.resize();
    Specgram.onResize();
  };


  /**
   * Global event handlers.
   */
  window.addEventListener('resize', function () {
    clearTimeout(resizeEvent);
    resizeEvent = setTimeout(Canopy.onResize, resizeTimer);
  });

  window.addEventListener('polymer-ready', function(e) {
    var drawer = document.getElementById('i-drawer');
    var loader = document.getElementById('i-loader');
    var codeView = document.getElementById('i-code-view');

    var renderSettingBtn = document.getElementById('i-setting-button');
    var renderSettingContainer = document.getElementById('i-render-setting');
    renderSettingBtn.onclick = function () {
      renderSettingContainer.toggle();
    };

    loader.onFileLoaded = function (codeStr) {
      Editor.setCodeString(codeStr);
      drawer.closeDrawer();
    };

    WaveformRenderer.setController(Canopy);

    // Editor.render();
    Canopy.onResize();
  });
  
})(Canopy);