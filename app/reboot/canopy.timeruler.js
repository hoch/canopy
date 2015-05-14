// TimeRuler class definition.

// TODO
// - support samples (time unit)
// - draw subdivisions

(function (Canopy) {

  // class-static styles.
  var STYLE = {
    height: 32,
    color: '#37474F',
    gridWidth: 55,
    gridLineWidth: 1.0,
    gridColor: '#CFD8DC',
    font: '11px Arial'
  };

  /**
   * @class TimeRuler
   * @param {[type]} ctx    [description]
   * @param {[type]} x      [description]
   * @param {[type]} y      [description]
   * @param {[type]} width  [description]
   * @param {[type]} height [description]
   */
  function TimeRuler(ctx, x, y, width, height) {
    this.initialize(ctx, x, y, width, height);
  }

  TimeRuler.prototype.initialize = function (ctx, x, y, width, height) {
    this.ctx = ctx;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = (height || STYLE.height);

    // Set font once.
    this.ctx.font = STYLE.font;
    this.gridDuration = 1.0;
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
    this.ctx.textAlign = 'center';

    // Push down.
    this.ctx.save();
    this.ctx.translate(this.x, this.y);

    // clear background for ruler.
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Draw grid.
    this.ctx.beginPath();
    this.ctx.fillStyle = STYLE.gridColor;
    while (startGrid <= endGrid) {
      xPos = this.timeToPixel(startGrid, start, totalDuration);
      this.ctx.fillText(this.formatTime(startGrid), xPos, STYLE.height * 0.4);
      this.ctx.moveTo(xPos, STYLE.height * 0.7);
      this.ctx.lineTo(xPos, STYLE.height);
      startGrid += this.gridDuration;
    }
    this.ctx.stroke();

    // Pop back up.
    this.ctx.restore();
  };

  Canopy.createTimeRuler = function (ctx, x, y, width, height) {
    return new TimeRuler(ctx, x, y, width, height);
  };

})(Canopy = {});