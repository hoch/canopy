/**
 * @license Copyright (c) 2015 Hongchan Choi. MIT License.
 * @fileOverview Canopy audio previewer with realtime audio context.
 */
(function (Canopy) {

  'use strict';

  var Audio = {};

  var _context = new AudioContext();
  var _masterGain = _context.createGain();
  var _lastRenderedBuffer = null;
  var _currentBufferSource = null;

  _masterGain.connect(_context.destination);

  /**
   * [loop description]
   * @type {Boolean}
   */
  Audio.loop = false;

  /**
   * [toggleLoop description]
   * @return {[type]} [description]
   */
  Audio.toggleLoop = function () {
    Audio.loop = !Audio.loop;

    // If there is an on-going buffer playback, stop playback.
    if (!Audio.loop && _currentBufferSource) {
      _currentBufferSource.loop = false;
      _currentBufferSource.stop();
    }
  };

  /**
   * [play description]
   * @param  {[type]} start [description]
   * @param  {[type]} end   [description]
   * @return {[type]}       [description]
   */
  Audio.play = function (start, end) {
    if (!_lastRenderedBuffer) {
      Canopy.LOG('/audio/ Playback failed. (invalid AudioBuffer)');
      return;
    }

    // If there is an on-going buffer source, stop it.
    if (_currentBufferSource) {
      _currentBufferSource.stop();
      _currentBufferSource = null;
    }

    _currentBufferSource = _context.createBufferSource();
    _currentBufferSource.buffer = _lastRenderedBuffer;
    _currentBufferSource.loop = Audio.loop;
    _currentBufferSource.connect(_masterGain);

    // The behavior depends on the loop flag.
    if (!Audio.loop) {
      _currentBufferSource.start(_context.currentTime, start, end - start);
    } else {
      _currentBufferSource.loopStart = start;
      _currentBufferSource.loopEnd = end;
      _currentBufferSource.start(_context.currentTime, start);
    }
  };

  /**
   * [stop description]
   * @return {[type]} [description]
   */
  Audio.stop = function () {
    if (_currentBufferSource) {
      _currentBufferSource.stop();
      _currentBufferSource = null;
    }
  };

  /**
   * [setAudioBuffer description]
   * @param {[type]} buffer [description]
   */
  Audio.setAudioBuffer = function (buffer) {
    _lastRenderedBuffer = buffer;
    Audio.play(0, _lastRenderedBuffer.duration);
  };

  /**
   * [getRenderedBuffer description]
   * @return {[type]} [description]
   */
  Audio.getRenderedBuffer = function () {
    if (!_lastRenderedBuffer)
      return null;

    return _lastRenderedBuffer;
  };

  Canopy.Audio = Audio;

})(Canopy);
