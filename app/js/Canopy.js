/**
 * Canopy: Application Abstract.
 */
(function (Canopy) {

  'use strict';

  /**
   * Canopy Real-time audio engine.
   */
  Canopy.Audio = {};

  var context = new AudioContext();
  var masterGain = context.createGain();
  masterGain.connect(context.destination);

  var lastRenderedBuffer = null;
  var currentBufferSource = null;
  Canopy.Audio.loop = false;

  Canopy.Audio.toggleLoop = function () {
    Canopy.Audio.loop = !Canopy.Audio.loop;
    
    // If there is an on-going buffer playback, stop playback.
    if (!Canopy.Audio.loop && currentBufferSource) {
      currentBufferSource.loop = false;
      currentBufferSource.stop();
    }
  }

  Canopy.Audio.play = function (start, end) {
    if (!lastRenderedBuffer) {
      console.log('ERROR: Invalid buffer.');
      return;
    }

    // If there is an on-going buffer source, stop it.
    if (currentBufferSource) {
      currentBufferSource.stop();
      currentBufferSource = null;
    }

    currentBufferSource = context.createBufferSource();
    currentBufferSource.buffer = lastRenderedBuffer;
    currentBufferSource.loop = Canopy.Audio.loop;
    currentBufferSource.connect(masterGain);

    // The behavior depends on the loop flag.
    if (!Canopy.Audio.loop) {
      currentBufferSource.start(context.currentTime, start, end - start);
    } else {
      currentBufferSource.loopStart = start;
      currentBufferSource.loopEnd = end;
      currentBufferSource.start(context.currentTime, start);
    }
  };

  Canopy.Audio.stop = function () {
    if (currentBufferSource) {
      currentBufferSource.stop();
      currentBufferSource = null;
    }
  };

  Canopy.Audio.setAudioBuffer = function (buffer) {
    lastRenderedBuffer = buffer;
    Canopy.Audio.play(0, lastRenderedBuffer.duration);
  };

})(Canopy = {});