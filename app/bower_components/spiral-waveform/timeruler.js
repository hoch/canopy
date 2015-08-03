(function (SpiralWaveform) {

  var STYLE = {
    width: 400,
    height: 32,
    color: '#B0BEC5',
    colorShadow: '#78909C',
    gridWidth: 80,
    gridLineWidth: 1.0,
    gridColor: '#263238',
    font: '11px Arial'
  };

  /**
   * @class TimeRuler
   */
  function TimeRuler(ctx, x, y, width, height) {
    this.initialize(ctx, x, y, width, height);
  }

  TimeRuler.prototype.initialize = function (ctx, x, y, width, height) {
    this.ctx = ctx;
    this.x = x;
    this.y = y;
    this.width = (width || STYLE.width);
    this.height = (height || STYLE.height);
    this.gridDuration = 1.0;
    this.externalGridDrawer = null;
  };

  TimeRuler.prototype.setSize = function (width, height) {
    this.width = (width || STYLE.width);
    this.height = (height || STYLE.height);
    this.ctx.canvas.width = this.width;
    this.ctx.canvas.height = this.height;
    this.ctx.canvas.style.width = this.width + 'px';
    this.ctx.canvas.style.height = this.height + 'px';
  };

  // length as in number of samples.
  TimeRuler.prototype.setBufferInfo = function (sampleRate, length) {
    this.bufferSampleRate = sampleRate;
    this.bufferLength = length;
  };

  TimeRuler.prototype.formatTime = function (second) {
    return second.toFixed(3);
  };

  // time, start time, total duration => a pixel position in width.
  TimeRuler.prototype.timeToPixel = function (time, start, totalDuration) {
    return (time - start) / totalDuration * this.width;
  };

  // Convert pixels to seconds.
  TimeRuler.prototype.pixelsToSeconds = function(pixels) {
    return this.secondPerPixel * pixels;
  };

  TimeRuler.prototype.calculateGrid = function (range) {
    // Convert to msec and divide by the max number of grids.
    var rangeMsec = (range * 1000) / (~~(this.width / STYLE.gridWidth) - 1);

    // This is from: http://stackoverflow.com/questions/8506881/
    var exponent = ~~(Math.log10(rangeMsec));
    var fraction = rangeMsec / Math.pow(10, exponent);
    var niceFraction = Math.pow(10, exponent);
    
    if (fraction < 1.5)
      niceFraction *= 1;
    else if (fraction < 3)
      niceFraction *= 2;
    else if (fraction < 7)
      niceFraction *= 5;
    else
      niceFraction *= 10;
    
    this.gridDuration = niceFraction / 1000;
  };

  // start, end as in seconds.
  TimeRuler.prototype.draw = function (start, end) {
    // TO FIX: optimize this.
    this.calculateGrid(end - start);

    this.secondPerPixel = (end - start) / this.width;
    
    // Set up parameters
    var totalDuration = end - start;
    var startGrid = start
    var remainder = start % this.gridDuration;
    if (remainder > 0)
      startGrid = start + this.gridDuration - remainder;
    var endGrid = end - (end % this.gridDuration);
    var xPos;

    // Prepare for drawing.
    this.ctx.fillStyle = STYLE.color;
    this.ctx.strokeStyle = STYLE.gridColor;
    this.ctx.lineWidth = STYLE.gridLineWidth;
    this.ctx.font = STYLE.font;
    this.ctx.textAlign = 'left';

    // Push down.
    this.ctx.save();
    this.ctx.translate(this.x, this.y);

    // clear background.
    this.ctx.fillStyle = STYLE.color;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Draw grid.
    this.ctx.beginPath();
    this.ctx.fillStyle = STYLE.gridColor;
    while (startGrid <= endGrid) {
      xPos = this.timeToPixel(startGrid, start, totalDuration);
      this.ctx.fillText(this.formatTime(startGrid), xPos, this.height * 0.5);
      this.ctx.moveTo(xPos, this.height * 0.7);
      this.ctx.lineTo(xPos, this.height);
      startGrid += this.gridDuration;
    }
    this.ctx.stroke();

    // Draw the bottom border.
    this.ctx.fillStyle = STYLE.colorShadow;
    this.ctx.fillRect(0, this.height - 1, this.width, 1);

    // Pop back up.
    this.ctx.restore();
  };

  SpiralWaveform.createTimeRuler = function (ctx, x, y, width, height) {
    return new TimeRuler(ctx, x, y, width, height);
  };

})(SpiralWaveform = {});