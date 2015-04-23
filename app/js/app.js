// Canopy app Controller.
(function (Canopy) {

  var resizeTimer = 250;
  var resizeEvent;

  // Create modules.
  var Specgram = Canopy.createSpecgram('i-specgram');
  var Waveform = Canopy.createWaveform('i-waveform');
  var MiniMap = Canopy.createMiniMap('i-minimap');
  var Editor = Canopy.createEditor({
    editor: 'i-editor',
    renderButton: 'i-render-button',
    sampleRateInput: 'i-setting-samplerate',
    durationInput: 'i-setting-duration',
    numChannelsInput: 'i-setting-numchannels',
    console: 'i-console'
  });

  Canopy.setBuffer = function (buffer) {

  };

  // System-wide router.
  Canopy.notify = function (moduleId, action, data) {    
    switch (moduleId) {
      case 'minimap':
        if (action === 'viewport-change')
          Waveform.setViewPort(data.start, data.end);
        break;
      case 'waveform':
        if (action === 'viewport-change')
          MiniMap.setSampleRange(data.start, data.end);
        break;
      case 'editor':
        if (action === 'render-complete') {
          Canopy.Audio.setBuffer(data.buffer);
          MiniMap.setBuffer(data.buffer);
          Waveform.setBuffer(data.buffer);
          Specgram.setBuffer(data.buffer);
        }
        break;
    }
  };

  Canopy.onResize = function () {
    // console.log('resized');
    MiniMap.onResize();
    Waveform.onResize();
    Editor.onResize();
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

    // Editor.render();
    Canopy.onResize();
  });
  
})(Canopy);