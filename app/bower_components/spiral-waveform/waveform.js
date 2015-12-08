(function (SpiralWaveform) {

  var STYLE = {
    width: 400,
    height: 128,
    color: '#2196F3',
    colorClipped: '#E91E63',
    colorBackground: '#ECEFF1',
    colorGridLine: '#B0BEC5',
    colorCenterLine: '#78909C',
    colorBorder: '#546E7A',
    SPPThreshold: 12.0
  };

  /**
   * @class WaveformDrawer
   */
  function WaveformDrawer(ctx, x, y, width, height) {
    this.initialize(ctx, x, y, width, height);
  }

  WaveformDrawer.prototype.initialize = function (ctx, x, y, width, height) {
    this.ctx = ctx;
    this.x = x;
    this.y = y;
    this.width = (width || STYLE.width);
    this.height = (height || STYLE.height);
    this.yCenter = this.height / 2;
    this.data = null;
    this.dataDuration = 0;
    this.sampleRate = 44100;
    this.timeRuler = null;
  };

  WaveformDrawer.prototype.setSize = function (width, height) {
    this.width = (width || STYLE.width);
    this.height = (height || STYLE.height);
    this.yCenter = this.height / 2;
  };

  WaveformDrawer.prototype.setSampleData = function (channelData, sampleRate) {
    this.data = channelData;
    this.sampleRate = (sampleRate || 44100);
    this.dataDuration = this.data.length / this.sampleRate;
  };

  WaveformDrawer.prototype.setTimeRuler = function (timeRuler) {
    this.timeRuler = timeRuler;
  };

  // start and end as in seconds.
  WaveformDrawer.prototype.draw = function (start, end, maxPeak) {

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

    // Draw grid.
    this._drawGrids();

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
      this._drawWithLinearInterpolation(start, end, SPP, maxPeak);

    // clear residues.
    this.ctx.strokeStyle = STYLE.colorBorder;
    this.ctx.strokeRect(0, this.height, this.width, 1);

    // Pop back up context.
    this.ctx.restore();
  };

  WaveformDrawer.prototype._drawGrids = function () {
    var grid = this.timeRuler.currentGridsPos;

    this.ctx.strokeStyle = STYLE.colorGridLine;
    this.ctx.beginPath();
    for (var i = 0; i < grid.length; i++) {
      this.ctx.moveTo(grid[i], 0);
      this.ctx.lineTo(grid[i], this.height);
    }
    this.ctx.stroke();
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

  WaveformDrawer.prototype._drawWithLinearInterpolation = function (start, end, SPP, maxPeak) {
    // TODO: factorization/optimization.

    // Get the sample range to draw.
    var startIndex = Math.floor((start / this.dataDuration) * this.data.length);
    var endIndex = Math.ceil((end / this.dataDuration) * this.data.length);

    // Second per sample.
    var SPS = this.dataDuration / this.data.length;

    this.ctx.beginPath();
    for (var i = startIndex; i < endIndex; i++) {
      var x = (i * SPS - start) / (end - start) * this.width;
      var y = (1 - (this.data[i] / maxPeak)) * this.yCenter;

      if (x === 0)
        this.ctx.moveTo(x, y);
      else
        this.ctx.lineTo(x, y);

      if (SPP < 1.0)
        this.ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
    }
    this.ctx.stroke();

  };

  WaveformDrawer.prototype.gridDrawer = function (xPos) {

  };

  SpiralWaveform.createWaveformDrawer = function (ctx, x, y, width, height) {
    return new WaveformDrawer(ctx, x, y, width, height);
  };

})(SpiralWaveform);
