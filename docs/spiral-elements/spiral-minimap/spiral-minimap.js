(function (SpiralMiniMap) {

  var STYLE = {
    width: 400,
    height: 64,
    heightInfoArea: 16,
    color: '#4FC3F7',
    colorBackground: '#ECEFF1',
    colorOverlayRect: 'rgba(240, 240, 240, 0.75)',
    colorHandle: '#7C4DFF',
    colorCenterLine: '#37474F',
    colorInfo: '#FFF',
    colorBorder: '#FFF',
    fontInfo: '11px Arial',
    SPPThreshold: 10.0
  };

  /**
   * @class MiniMap
   */
  function MiniMap(ctx, width, height) {
    this._initialize(ctx, width, height);
  }


  // Initialize MiniMap instance.
  // TODO: the sample rate should be adjustable.
  MiniMap.prototype._initialize = function(ctx, width, height) {
    // this.x = x;
    // this.y = y;
    this.width = (width || STYLE.width);
    this.height = (height || STYLE.height);
    this.yCenter = this.height / 2;
    this.regionStart = 0.0;
    this.regionEnd = 1.0;
    this.data = null;
    this.sampleRate = 44100;
    this.absPeak = 0.0;

    this.ctx = ctx;
    this.ctx.textAlign = 'center';

    // For offscreen rendering.
    var offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = this.width;
    offscreenCanvas.height = this.height;
    this.ctxOS = offscreenCanvas.getContext('2d');

    this._needsRedraw = false;
  };

  // Draw waveform.
  MiniMap.prototype._drawWaveform = function () {
    // If redraw is not necessary, simply copy the current buffer to the screen.
    if (!this._needsRedraw) {
      this.ctx.drawImage(this.ctxOS.canvas, 0, 0);
      return;
    }

    var startIndex = 0;
    var endIndex = this.data.length;

    // Calculate Sample-Per-Pixel.
    var SPP = (endIndex - startIndex) / this.width;

    // Clear the current rendering.
    this.ctxOS.fillStyle = STYLE.colorBackground;
    this.ctxOS.fillRect(0, 0, this.width, this.height);

    // Draw center line.
    this.ctxOS.beginPath();
    this.ctxOS.strokeStyle = STYLE.colorCenterLine;
    this.ctxOS.moveTo(0, this.yCenter);
    this.ctxOS.lineTo(this.width, this.yCenter);
    this.ctxOS.stroke();

    // Draw the actual waveform with subsampling. Note that this assumes that
    // the number of samples is always bigger than the width pixels on the
    // viewport.
    this._drawSubSampling(startIndex, endIndex, SPP);

    // Clear residues.
    // this.ctxOS.strokeStyle = STYLE.colorBorder;
    // this.ctxOS.strokeRect(0, 0, this.width, this.height);

    // Transfer the new rendering to the screen.
    this.ctx.drawImage(this.ctxOS.canvas, 0, 0);

    // The buffer has been drawn, no redraw necessary.
    this._needsRedraw = false;
  };

  // Drawing subroutine with subsampling technique.
  MiniMap.prototype._drawSubSampling = function (startIndex, endIndex) {
    // Subsampling uses block scanning to find the positive max and negative max
    // for the target region.
    var SPP = (endIndex - startIndex) / this.width;
    var blockStart = startIndex;
    var blockEnd = startIndex + SPP;
    var negMax = 0.0, posMax = 0.0;

    this.ctxOS.beginPath();

    // Need to draw every pixel: almost always numSamplesToDraw > numPixels.
    for (var i = 0; i < this.width; i++) {

      // Sub-sampling routine: the range of sub-sampling is
      // [floor(blockStart), ceiling(blockEnd)].
      var index = Math.floor(blockStart);
      blockEnd = blockEnd;
      negMax = posMax = 0.0;

      while (index < blockEnd) {
        var value = this.data[index];
        if (value > posMax)
          posMax = value;
        else if (value < negMax)
          negMax = value;
        index++;
      }

      // Clip the visualization and scaling.
      posMax = Math.min(1.0, posMax / this.absPeak);
      negMax = Math.max(-1.0, negMax / this.absPeak);

      // Get drawing Y offsets.
      this.ctxOS.moveTo(i, (1 - posMax) * this.yCenter);
      this.ctxOS.lineTo(i, (1 - negMax) * this.yCenter);

      blockStart = blockEnd;
      blockEnd += SPP;
    }

    this.ctxOS.strokeStyle = STYLE.color;
    this.ctxOS.stroke();
  };

  // Draw overlay.
  // TODO: fixed all the hard-coded numbers.
  MiniMap.prototype._drawOverlay = function() {
    var regionStartPixel = (this.regionStart * this.sampleRate / this.data.length) * this.width;
    var regionEndPixel = (this.regionEnd * this.sampleRate / this.data.length) * this.width;

    // Draw opaque rectangles.
    this.ctx.fillStyle = STYLE.colorOverlayRect;
    this.ctx.fillRect(0, 0, regionStartPixel, this.height);
    this.ctx.fillRect(regionEndPixel, 0, this.width - regionEndPixel, this.height);

    this.ctx.fillStyle = STYLE.colorHandle;

    // Center line.
    this.ctx.fillRect(regionStartPixel, this.yCenter, regionEndPixel - regionStartPixel, 1);
    
    // Left handle.
    this.ctx.fillRect(regionStartPixel, 0, 2, this.height);
    this.ctx.fillRect(regionStartPixel, 0, 42, 18);
    
    // Right handle.
    this.ctx.fillRect(regionEndPixel - 2, 0, 2, this.height);
    this.ctx.fillRect(regionEndPixel - 42, this.height - 18, 42, 18);

    // Draw texts.
    this.ctx.font = STYLE.fontInfo;
    this.ctx.textAlign = 'center';
    this.ctx.fillStyle = STYLE.colorInfo;
    this.ctx.fillText(this.regionStart.toFixed(3), regionStartPixel + 20, 12);
    this.ctx.fillText(this.regionEnd.toFixed(3), regionEndPixel - 20, this.height - 5);

    var regionWidth = regionEndPixel - regionStartPixel;
    if (regionWidth > 40) {
      this.ctx.fillStyle = STYLE.colorHandle;
      this.ctx.fillText((this.regionEnd - this.regionStart).toFixed(3),
        regionStartPixel + regionWidth * 0.5, this.yCenter + 15);
    }
  };

  // Handle invalid audio buffer. Mainly to display warning message.
  MiniMap.prototype.handleInvalidAudioBuffer = function () {
    this.ctx.textAlign = 'center';
    this.ctx.font = STYLE.fontInfo;
    this.ctx.fillText('Nothing to display.', this.width * 0.5, this.yCenter + 5);
  };


  /** Public methods */

  MiniMap.prototype.setAudioBuffer = function (audioBuffer) {
    // Sum audio buffer into mono channel data.
    var numChannels = audioBuffer.numberOfChannels;
    this.data = new Float32Array(audioBuffer.length);
    for (var i = 0; i < numChannels; i++) {
      var channelData = audioBuffer.getChannelData(i);
      for (var j = 0; j < channelData.length; j++) {
        this.data[j] += channelData[j] / numChannels;
      }
    }

    // Find the absolute peak value.
    this.absPeak = 0.0;
    var absValue = 0.0;
    for (var i = 0; i < this.data.length; i++) {
      absValue = Math.abs(this.data[i]);
      if (this.absPeak < absValue)
        this.absPeak = absValue;
    }

    // TODO: why 0.01?
    this.absPeak = Math.max(0.01, this.absPeak);

    // Initialize start, end and sampleRate.
    this.regionStart = 0.0;
    this.regionEnd = audioBuffer.duration;
    this.sampleRate = audioBuffer.sampleRate;

    // Mark this buffer as dirty.
    this._needsRedraw = true;
    this.draw();
  };

  MiniMap.prototype.setSize = function (width, height) {
    this.width = (width || STYLE.width);
    this.height = (height || STYLE.height);
    this.ctxOS.canvas.width = this.width;
    this.ctxOS.canvas.height = this.height;

    // To avoid the smoothing.
    this.yCenter = ~~(0.5 + this.height / 2);

    this._needsRedraw = true;
    this.draw();
  };

  MiniMap.prototype.draw = function () {
    if (!this.data) {
      this.handleInvalidAudioBuffer();
      return;
    }

    this._drawWaveform();
    this._drawOverlay();
  };

  MiniMap.prototype.setRegion = function (start, end) {
    if (!this.data)
      return;

    this.regionStart = Math.max(0, start);
    this.regionEnd = Math.min(this.data.length / this.sampleRate, end);
    
    this.draw();
  };

  MiniMap.prototype.getRegion = function () {
    return {
      start: this.regionStart,
      end: this.regionEnd
    };
  };

  MiniMap.prototype.getCenterCoord = function () {
    return this.yCenter;
  };  

  // Expose the factory.
  SpiralMiniMap.create = function (ctx, width, height) {
    return new MiniMap(ctx, width, height);
  };

})(SpiralMiniMap = {});
