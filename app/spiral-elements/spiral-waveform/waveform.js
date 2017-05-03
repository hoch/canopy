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
    colorInvalid: '#E91E63',
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

    // Assigning |channelData| directly to the other object won't work on FF.
    this._channelData = new Float32Array(channelData);
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
  WaveformDrawer.prototype._drawWithSubsampling =
      function (startIndex, endIndex, samplePerPixel, maxDisplayGain) {
    // Set up a window for sampling.
    var windowStart = startIndex;
    var windowEnd = startIndex + samplePerPixel;

    var negMax = 0.0;
    var posMax = 0.0;
    var value;

    // Need to draw every pixel: numSamplesToDraw > numPixels
    this._ctx.beginPath();
    this._ctx.fillStyle = this._ctx.strokeStyle = STYLE.color;
    for (var i = 0; i < this.width; i++) {
      // Sub-sampling routine: the range of sub-sampling is
      // [floor(windowStart), ceiling(windowEnd)].
      var index = Math.floor(windowStart);
      // windowEnd = windowEnd;
      negMax = posMax = 0.0;

      // Iterate through the sampling window. The compiled version below.
      while (index < windowEnd) {
        value = this._channelData[index++];
        if (value > posMax)
          posMax = value;
        else if (value < negMax)
          negMax = value;
      }

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
  WaveformDrawer.prototype._drawWithLinearInterpolation =
      function (start, end, samplePerPixel, maxDisplayGain) {

    // Set up the parameters.
    var secondPerSample = this._duration / this._channelData.length;
    var startIndex = Math.floor(start / secondPerSample);
    var endIndex = Math.ceil(end / secondPerSample);
    var point;

    // The linear interpolation rendering is driven by the number of samples,
    // not the number of pixels. First, get x/y coordinate and the validity of
    // sample.
    var windowArray = [];
    for (var i = startIndex; i < endIndex; ++i) {
      windowArray.push([
          (i * secondPerSample - start) / (end - start) * this.width,
          (1 - (this._channelData[i] / maxDisplayGain)) * this.height * 0.5,
          isFinite(this._channelData[i])
        ]);
    }

    // Draw valid samples first.
    this._ctx.beginPath();
    this._ctx.fillStyle = this._ctx.strokeStyle = STYLE.color;
    for (var i = 0; i < windowArray.length; ++i) {
      point = windowArray[i];
      // If somehow x is smaller than 0 or y is invalid, move to the time
      // position without drawing a line.
      if (point[0] <= 0 || !point[2]) {
        this._ctx.moveTo(point[0], point[1]);
        continue;
      }

      this._ctx.lineTo(point[0], point[1]);

      // If sample-per-pixel is below 1.0, draw a blob head for each sample.
      // The size of the blob here is 3 x 3 pixels.
      if (samplePerPixel < 1.0)
        this._ctx.fillRect(point[0] - 1.5, point[1] - 1.5, 3, 3);
    }
    this._ctx.stroke();

    // Then draw invalid samples.
    this._ctx.beginPath();
    this._ctx.fillStyle = this._ctx.strokeStyle = STYLE.colorInvalid;
    for (var i = 0; i < windowArray.length; ++i) {
      point = windowArray[i];
      // If the point is a valid data, skip this.
      if (point[2])
        continue;

      this._ctx.fillRect(point[0] - 1, this.height * 0.5 - 1, 2, 2);
    }
    this._ctx.stroke();
  };

  SpiralWaveform.createWaveformDrawer = function (ctx, x, y, width, height) {
    return new WaveformDrawer(ctx, x, y, width, height);
  };

})(SpiralWaveform);
