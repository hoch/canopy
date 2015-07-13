/**
 * main.js
 *
 * main entry point.
 */

(function (Canopy) {

  'use strict';

  

  Canopy.initialize = function () {

    var canopyEditor = Canopy.createEditor({
      settingsButton: 'i-settings-btn',
      renderButton: 'i-render-btn',
      editor: 'i-editor',
      numChannelsInput: 'i-setting-numchannels',
      sampleRateInput: 'i-setting-samplerate',
      durationInput: 'i-setting-duration'    
    });

    var renderSettingBtn = document.getElementById('i-settings-btn');
    var renderSettingContainer = document.getElementById('i-render-settings');
    renderSettingBtn.onclick = function () {
      renderSettingContainer.toggle();
    };

  };


})(Canopy);