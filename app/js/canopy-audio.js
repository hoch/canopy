/**
 * Canopy Real-time audio engine.
 */

(function (CanopyAudio) {

  'use strict';

  var context = new AudioContext();
  var masterGain = context.createGain();

  masterGain.connect(context.destination);

  var lastRenderedBuffer = null;
  var currentBufferSource = null;

  CanopyAudio.loop = false;

  CanopyAudio.toggleLoop = function () {
    CanopyAudio.loop = !CanopyAudio.loop;

    // If there is an on-going buffer playback, stop playback.
    if (!CanopyAudio.loop && currentBufferSource) {
      currentBufferSource.loop = false;
      currentBufferSource.stop();
    }
  };

  CanopyAudio.play = function (start, end) {
    if (!lastRenderedBuffer) {
      console.log('[CanopyAudio] Playback failed due to invalid buffer.');
      return;
    }

    // If there is an on-going buffer source, stop it.
    if (currentBufferSource) {
      currentBufferSource.stop();
      currentBufferSource = null;
    }

    currentBufferSource = context.createBufferSource();
    currentBufferSource.buffer = lastRenderedBuffer;
    currentBufferSource.loop = CanopyAudio.loop;
    currentBufferSource.connect(masterGain);

    // The behavior depends on the loop flag.
    if (!CanopyAudio.loop) {
      currentBufferSource.start(context.currentTime, start, end - start);
    } else {
      currentBufferSource.loopStart = start;
      currentBufferSource.loopEnd = end;
      currentBufferSource.start(context.currentTime, start);
    }
  };

  CanopyAudio.stop = function () {
    if (currentBufferSource) {
      currentBufferSource.stop();
      currentBufferSource = null;
    }
  };

  CanopyAudio.setAudioBuffer = function (buffer) {
    lastRenderedBuffer = buffer;
    CanopyAudio.play(0, lastRenderedBuffer.duration);
  };

  CanopyAudio.getRenderedBuffer = function () {
    if (!lastRenderedBuffer)
      return null;

    return lastRenderedBuffer;
  };

})(CanopyAudio = {});
