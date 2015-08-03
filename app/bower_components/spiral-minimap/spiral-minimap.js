(function (SpiralMiniMap) {

  var STYLE = {
    width: 400,
    height: 64,
    heightInfoArea: 16,
    color: '#4FC3F7',
    colorBackground: '#ECEFF1',
    colorOverlayRect: 'rgba(240, 240, 240, 0.75)',
    colorHandle: '#FF5722',
    colorCenterLine: '#37474F',
    colorInfo: '#FFF',
    colorBorder: '#FFF',
    fontInfo: '11px Arial',
    SPPThreshold: 10.0
  };

  /**
   * @class MiniMap
   */
  function MiniMap(ctx, x, y, width, height) {
    this.initialize(ctx, x, y, width, height);
  }


  /** Internal methods */

  MiniMap.prototype.initialize = function(ctx, x, y, width, height) {
    this.ctx = ctx;
    this.x = x;
    this.y = y;
    this.width = (width || STYLE.width);
    this.height = (height || STYLE.height);
    this.yCenter = this.height / 2;
    this.regionStart = 0.0;
    this.regionEnd = 1.0;
    this.data = null;
    this.sampleRate = 44100;
    this.absPeak = 0.0;

    this.ctx.font = 
    this.ctx.textAlign = 'center';
  };

  MiniMap.prototype.setSize = function (width, height) {
    this.width = (width || STYLE.width);
    this.height = (height || STYLE.height);
    this.yCenter = this.height / 2;
    this.draw();
  };

  // TODO: use off-screen drawing for higher performance.
  MiniMap.prototype.drawWaveform = function () {
    var startIndex = 0;
    var endIndex = this.data.length;

    // Calculate Sample-Per-Pixel.
    var SPP = (endIndex - startIndex) / this.width;

    // Push down context.
    this.ctx.save();
    this.ctx.translate(this.x, this.y);

    // Draw center line.
    this.ctx.beginPath();
    this.ctx.strokeStyle = STYLE.colorCenterLine;
    this.ctx.moveTo(0, this.yCenter);
    this.ctx.lineTo(this.width, this.yCenter);
    this.ctx.stroke();

    // Draw waveform. Branch based on the SPP level; if SPP is below than the
    // threshold, use sub-sampling for optimum visualization.
    if (SPP > STYLE.SPPThreshold)
      this.drawSubSampling(startIndex, endIndex, SPP);
    else
      this.drawLinearInterpolation(startIndex, endIndex, SPP);

    // Clear residues.
    this.ctx.strokeStyle = STYLE.colorBorder;
    this.ctx.strokeRect(0, 0, this.width, this.height);

    // Pop back up context.
    this.ctx.restore();
  };

  MiniMap.prototype.handleInvalidAudioBuffer = function () {
    this.ctx.textAlign = 'center';
    this.ctx.font = STYLE.fontInfo;
    this.ctx.fillText('Nothing to display.', this.width * 0.5, this.yCenter + 5);
  };

  MiniMap.prototype.drawSubSampling = function (startIndex, endIndex) {

    // For selected regions.
    // var regionStartIndex = this.regionStart * this.sampleRate;
    // var regionEndIndex = this.regionEnd * this.sampleRate;

    // For scanning-block.
    var SPP = (endIndex - startIndex) / this.width;
    var blockStart = startIndex;
    var blockEnd = startIndex + SPP;
    var negMax = 0.0, posMax = 0.0;

    
    // This is a two-step process: draw the normal region first and then draw
    // the highlighted region.
    this.ctx.beginPath();    

    // Need to draw every pixel: numSamplesToDraw > numPixels.
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
      this.ctx.moveTo(i, (1 - posMax) * this.yCenter);
      this.ctx.lineTo(i, (1 - negMax) * this.yCenter);

      blockStart = blockEnd;
      blockEnd += SPP;
    }

    this.ctx.strokeStyle = STYLE.color;
    this.ctx.stroke();
  };

  MiniMap.prototype.drawLinearInterpolation = function (startIndex, endIndex) {
    // For selected regions.
    var regionStartIndex = this.regionStart * this.sampleRate;
    var regionEndIndex = this.regionEnd * this.sampleRate;

    // Need to draw only if necessary: numSamplesToDraw < numPixels
    // Thus SPP < 1.0.
    var x = 0, px = -1;
    var index = startIndex;
    var value, yOffset;
    var maxValue = 0.0, maxValueIndex = startIndex;

    this.ctx.beginPath();

    // Go by numSamples.
    for (var i = startIndex; i < endIndex; i++) {

      var value = Math.abs(this.data[i]);
      if (value > maxValue){
        maxValue = value;
        maxValueIndex = i;
      }

      if (x - px >= 1) {
        var renderValue = this.data[maxValueIndex] / maxPeak;
        // renderValue = Math.min(1.0, Math.max(-1.0, renderValue));
        yOffset = (1 - renderValue) * this.yCenter;
        yOffset = Math.min(this.height - 0.5, Math.max(0.5, yOffset));

        // TODO: optimize this.
        if (regionStartIndex <= i && regionEndIndex <= i)
          this.ctx.strokeStyle = STYLE.colorRegion;
        else
          this.ctx.strokeStyle = STYLE.color;

        // Handle the first sample.
        if (x === 0)
          this.ctx.moveTo(x, yOffset);
        else
          this.ctx.lineTo(x, yOffset);

        // Draw a blob head when zoomed-in enough.
        if (SPP < 1.0)
          this.ctx.fillRect(x - 1.5, yOffset - 1.5, 3, 3);

        maxValue = 0;
        maxValueIndex = i;
        px = x;
      }

      // advance pixels-per-sample.
      x += 1 / SPP;
    }

    this.ctx.stroke();
  };

  MiniMap.prototype.drawOverlay = function() {
    
    // Draw opaque rectangles.
    var regionStartPixel = (this.regionStart * this.sampleRate / this.data.length) * this.width;
    var regionEndPixel = (this.regionEnd * this.sampleRate / this.data.length) * this.width;

    this.ctx.fillStyle = STYLE.colorOverlayRect;
    this.ctx.fillRect(0, 0, regionStartPixel, this.height);
    this.ctx.fillRect(regionEndPixel, 0, this.width - regionEndPixel, this.height);

    // Draw handles. (boxes)
    this.ctx.fillStyle = STYLE.colorHandle;
    this.ctx.fillRect(regionStartPixel, this.yCenter, regionEndPixel - regionStartPixel, 1);
    this.ctx.fillRect(regionStartPixel, 0, 4, this.height);
    this.ctx.fillRect(regionStartPixel - 40, this.yCenter - 10, 40, 20);
    this.ctx.fillRect(regionEndPixel - 4, 0, 4, this.height);
    this.ctx.fillRect(regionEndPixel, this.yCenter - 10, 40, 20);

    // Draw texts.
    // TODO: fixed all the hard-coded numbers.
    this.ctx.font = STYLE.fontInfo;
    this.ctx.textAlign = 'center';
    this.ctx.fillStyle = STYLE.colorInfo;
    this.ctx.fillText(this.regionStart.toFixed(3), regionStartPixel - 20, this.yCenter + 4);
    this.ctx.fillText(this.regionEnd.toFixed(3), regionEndPixel + 20, this.yCenter + 4);

    var regionWidth = regionEndPixel - regionStartPixel;
    if (regionWidth > 40) {
      this.ctx.fillStyle = STYLE.colorHandle;
      this.ctx.fillText((this.regionEnd - this.regionStart).toFixed(3), 
        regionStartPixel + regionWidth * 0.5, this.yCenter + 15);
    }
  };

  MiniMap.prototype.drawInfo = function() {
    // TODO:
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
  };

  MiniMap.prototype.draw = function () {
    if (!this.data) {
      this.handleInvalidAudioBuffer();
      return;
    }

    this.ctx.fillStyle = STYLE.colorBackground;
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.drawWaveform();
    this.drawOverlay();
    this.drawInfo();
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

  // Expose the factory.
  SpiralMiniMap.create = function (ctx, x, y, width, height) {
    return new MiniMap(ctx, x, y, width, height);
  };

})(SpiralMiniMap = {});