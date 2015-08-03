(function (SpiralWaveform) {

  var STYLE = {
    width: 400,
    height: 128,
    color: '#2196F3',
    colorClipped: '#E91E63',
    colorBackground: '#ECEFF1',
    colorCenterLine: '#607D8B',
    colorBorder: '#546E7A',
    SPPThreshold: 10.0
  };

  /**
   * @class WaveformDrawer
   */
  function WaveformDrawer(ctx, x, y, width, height) {
    this.initialize(ctx, x, y, width, height);
  }

  WaveformDrawer.prototype.initialize = function(ctx, x, y, width, height) {
    this.ctx = ctx;
    this.x = x;
    this.y = y;
    this.width = (width || STYLE.width);
    this.height = (height || STYLE.height);
    this.yCenter = this.height / 2;
    this.data = null;
    this.sampleRate = 44100;
  };

  WaveformDrawer.prototype.setSize = function(width, height) {
    this.width = (width || STYLE.width);
    this.height = (height || STYLE.height);
    this.yCenter = this.height / 2;
  };

  WaveformDrawer.prototype.setSampleData = function(channelData, sampleRate) {
    this.data = channelData;
    this.sampleRate = (sampleRate || 44100);
  };

  // start and end as in seconds.
  WaveformDrawer.prototype.draw = function(start, end, maxPeak) {

    if (!this.data)
      return;

    // Truncated indices.
    var startIndex = Math.floor(start * this.sampleRate);
    var endIndex = Math.floor(end * this.sampleRate);

    // SamplesPerPixel
    var SPP = (endIndex - startIndex) / this.width;

    // Push down context.
    this.ctx.save();
    this.ctx.translate(this.x, this.y);

    // clear background for ruler.
    this.ctx.fillStyle = STYLE.colorBackground;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Draw center line.
    this.ctx.beginPath();
    this.ctx.strokeStyle = STYLE.colorCenterLine;
    this.ctx.moveTo(0, this.yCenter + 0.5);
    this.ctx.lineTo(this.width, this.yCenter + 0.5);
    this.ctx.stroke();

    this.ctx.fillStyle = this.ctx.strokeStyle = STYLE.color;

    // Use subsampling drawer if necessary.
    if (SPP > STYLE.SPPThreshold)
      this._drawWithSubsampling(startIndex, endIndex, SPP, maxPeak);
    else
      this._drawWithLinearInterpolation(startIndex, endIndex, SPP, maxPeak);

    // clear residues.
    this.ctx.strokeStyle = STYLE.colorBorder;
    this.ctx.strokeRect(0, this.height, this.width, 1);

    // Pop back up context.
    this.ctx.restore();
  };

  WaveformDrawer.prototype._drawWithSubsampling = function (startIndex, endIndex, SPP, maxPeak) {

    // Initial conditions.
    var blockStart = startIndex;
    var blockEnd = startIndex + SPP;
    var negMax = 0.0, posMax = 0.0;

    this.ctx.beginPath();

    // Need to draw every pixel: numSamplesToDraw > numPixels
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
      posMax = Math.min(1.0, posMax/maxPeak);
      negMax = Math.max(-1.0, negMax/maxPeak);

      // Get drawing Y offsets.
      this.ctx.moveTo(i, (1 - posMax) * this.yCenter);
      this.ctx.lineTo(i, (1 - negMax) * this.yCenter);

      blockStart = blockEnd;
      blockEnd += SPP;
    }

    this.ctx.stroke();
  };

  WaveformDrawer.prototype._drawWithLinearInterpolation = function (startIndex, endIndex, SPP, maxPeak) {

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

  WaveformDrawer.prototype.gridDrawer = function (xPos) {

  };

  SpiralWaveform.createWaveformDrawer = function (ctx, x, y, width, height) {
    return new WaveformDrawer(ctx, x, y, width, height);
  };

})(SpiralWaveform);