/**
 * @license MIT License. Copyright (c) 2015 Hongchan Choi. All rights reserved.
 */

/**
 * @closure WaveformDrawer
 * @description A submodule class of spiral-waveform for rendering waveform.
 *              Offers fluid zoom-in/out and x-y grid drawing.
 */
(function (SpiralWaveform) {

  'use strict';

  var STYLE = {
    width: 400,
    height: 192,
    color: '#2196F3',
    colorClipped: '#E91E63',
    colorBackground: '#ECEFF1',
    colorGridLine: '#B0BEC5',
    colorWarningLine: '#FF6E40',
    colorCenterLine: '#78909C',
    colorBorder: '#546E7A',
    samplePerPixelThreshold: 12.0
  };

  function WaveformDrawer(ctx, x, y, width, height) {
    this._initialize(ctx, x, y, width, height);
  }

  WaveformDrawer.prototype._initialize = function (ctx, x, y, width, height) {
    this._ctx = ctx;
    this.x = x;
    this.y = y;
    this.width = (width || STYLE.width);
    this.height = (height || STYLE.height);

    this._channelData = null;
    this._duration = 0;
    this._sampleRate = null;

    this._timeGridPositions = null;
    this._ampGridPositions = null;

    this._needsRedraw = true;
    this._isInitialized = true;
  };


  /** Public **/

  WaveformDrawer.prototype.getSize = function (width, height) {
    return {
      x: x,
      y: y,
      width: width,
      height: height
    };
  };

  WaveformDrawer.prototype.setSize = function (width, height) {
    if (!this._isInitialized)
      return;

    this.width = (width || STYLE.width);
    this.height = (height || STYLE.height);
  };

  WaveformDrawer.prototype.setChannelData = function (channelData, sampleRate) {
    if (!sampleRate) {
      throw new Error('[SpiralWaveForm::WaveformDrawer::setChannelData]' +
        ' sampleRate MUST be specified.');
    }

    this._channelData = channelData;
    this._sampleRate = sampleRate;
    this._duration = this._channelData.length / this._sampleRate;

    // The channel data is newly set, should be redrawn.
    this._needsRedraw = true;
  };

  WaveformDrawer.prototype.updateGridInfo = function (timeGrids, ampGrids) {
    // TODO: clone? or just use the reference?
    this._timeGridPositions = timeGrids;
    this._ampGridPositions = ampGrids;

    this._needsRedraw = true;
  };

  // Draw waveform with start, end tiem and the maximum display gain.
  WaveformDrawer.prototype.draw = function (start, end, maxDisplayGain) {
    if (!this._needsRedraw || !this._isInitialized || !this._channelData)
      return;

    // Get sample indice;
    var startIndex = Math.floor(start * this._sampleRate);
    var endIndex = Math.floor(end * this._sampleRate);

    // Calculate sample-per-pixel.
    var samplePerPixel = (endIndex - startIndex) / this.width;

    // Push, translate, clip.
    this._ctx.save();
    this._ctx.translate(this.x, this.y);
    this._ctx.rect(0, 0, this.width, this.height);
    this._ctx.clip();

    // clear background.
    this._ctx.fillStyle = STYLE.colorBackground;
    this._ctx.fillRect(0, 0, this.width, this.height);

    // Draw grids.
    this._drawTimeAndAmplitudeGrids(maxDisplayGain);

    // Draw center line.
    this._ctx.beginPath();
    this._ctx.strokeStyle = STYLE.colorCenterLine;
    this._ctx.moveTo(0, this.height * 0.5);
    this._ctx.lineTo(this.width, this.height * 0.5);
    this._ctx.stroke();

    this._ctx.fillStyle = this._ctx.strokeStyle = STYLE.color;

    if (samplePerPixel > STYLE.samplePerPixelThreshold) {
      // If |samplePerPixel| is greater than the threshold (i.e. zoomed out),
      // use sub-sampling rendering (skipping samples over time) The rendering
      // reference is the sample index in this case.
      this._drawWithSubsampling(startIndex, endIndex, samplePerPixel, maxDisplayGain);
    } else {
      // Otherwise, use the linear interpolation (i.e. zoomed in). The rendering
      // reference is the time in this case.
      this._drawWithLinearInterpolation(start, end, samplePerPixel, maxDisplayGain);
    }

    // clear residues.
    // this._ctx.strokeStyle = STYLE.colorBorder;
    // this._ctx.strokeRect(0, this.height, this.width, 1);

    // Pop back up context.
    this._ctx.restore();

    // It has been drawn, flip the flag.
    this._needsRedraw = false;
  };


  /** Internal helpers **/

  // Draw time and amp grids. This MUST be called inside of _draw() method.
  WaveformDrawer.prototype._drawTimeAndAmplitudeGrids = function (maxDisplayGain) {
    if (!this._timeGridPositions || !this._ampGridPositions)
      return;

    var posY, negY;

    this._ctx.beginPath();
    this._ctx.strokeStyle = STYLE.colorGridLine;

    // Draw grids.
    this._timeGridPositions.forEach(function (x, time) {
      this._ctx.moveTo(x - 0.5, 0);
      this._ctx.lineTo(x - 0.5, this.height);
    }.bind(this));

    this._ampGridPositions.forEach(function (y, gain) {
      if (gain === 1.0) {
        posY = y;
        return;
      }

      if (gain === -1.0) {
        negY = y;
        return;
      }

      this._ctx.moveTo(0, y + 0.5);
      this._ctx.lineTo(this.width, y + 0.5);
    }.bind(this));

    this._ctx.stroke();

    // Draw 0 dBFS guide line (|amp| = 1.0).
    if (!posY || !negY)
      return;

    this._ctx.beginPath();
    this._ctx.strokeStyle = STYLE.colorWarningLine;

    this._ctx.moveTo(0, posY + 0.5);
    this._ctx.lineTo(this.width, posY + 0.5);
    this._ctx.moveTo(0, negY + 0.5);
    this._ctx.lineTo(this.width, negY + 0.5);

    this._ctx.stroke();
  };

  // Draw waveform with sub-sampling (sample-skipping). This MUST be called
  // inside of _draw() method.
  WaveformDrawer.prototype._drawWithSubsampling = function (startIndex, endIndex, samplePerPixel, maxDisplayGain) {
    // Set up a window for sampling.
    var windowStart = startIndex;
    var windowEnd = startIndex + samplePerPixel;

    // Positive max and negative max.
    var negMax = 0.0;
    var posMax = 0.0;

    this._ctx.beginPath();

    // Need to draw every pixel: numSamplesToDraw > numPixels
    for (var i = 0; i < this.width; i++) {
      // Sub-sampling routine: the range of sub-sampling is
      // [floor(windowStart), ceiling(windowEnd)].
      var index = Math.floor(windowStart);
      windowEnd = windowEnd;
      negMax = posMax = 0.0;

      // Iterate through the sampling window. The compiled version below.
      // while (index < windowEnd) {
      //   var value = this._channelData[index++];
      //   if (value > posMax)
      //     posMax = value;
      //   else if (value < negMax)
      //     negMax = value;
      // }

      // =Compiled version
      for(;index<windowEnd;){var value=this._channelData[index++];value>posMax?posMax=value:value<negMax&&(negMax=value)};

      // Clamping and scaling.
      posMax = Math.min(1.0, posMax / maxDisplayGain);
      negMax = Math.max(-1.0, negMax / maxDisplayGain);

      // Draw a line from the positive max to the negative max.
      this._ctx.moveTo(i, (1 - posMax) * this.height * 0.5);
      this._ctx.lineTo(i, (1 - negMax) * this.height * 0.5);

      windowStart = windowEnd;
      windowEnd += samplePerPixel;
    }

    this._ctx.stroke();
  };

  // Draw waveform with linear interpolation. This MUST be called inside of
  // _draw() method.
  WaveformDrawer.prototype._drawWithLinearInterpolation = function (start, end, samplePerPixel, maxDisplayGain) {
    // Set up the parameters.
    var secondPerSample = this._duration / this._channelData.length;
    var startIndex = Math.floor(start / secondPerSample);
    var endIndex = Math.ceil(end / secondPerSample);
    var x, y;

    this._ctx.beginPath();

    // The linear interpolation rendering is driven by the number of samples,
    // not the number of pixels.
    for (var i = startIndex; i < endIndex; i++) {
      x = (i * secondPerSample - start) / (end - start) * this.width;
      y = (1 - (this._channelData[i] / maxDisplayGain)) * this.height * 0.5;

      // If somehow x is smaller than 0, just move to the position without
      // drawing a line.
      if (x <= 0) {
        this._ctx.moveTo(x, y);
        continue;
      }

      // If sample-per-pixel is below 1.0, draw a blob head for each sample.
      // The size of the blob here is 3 x 3 pixels.
      this._ctx.lineTo(x, y);

      if (samplePerPixel < 1.0)
        this._ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
    }

    this._ctx.stroke();
  };

  SpiralWaveform.createWaveformDrawer = function (ctx, x, y, width, height) {
    return new WaveformDrawer(ctx, x, y, width, height);
  };

})(SpiralWaveform);
