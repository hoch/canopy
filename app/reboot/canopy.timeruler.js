// TimeRuler class definition.

// TODO
// - gridLevel detection
// - grid subdivision

(function (Canopy) {

  // class-static styles.
  var STYLE = {
    height: 32,
    color: '#37474F',
    gridWidth: 1.0,
    gridColor: '#CFD8DC',
    font: '11px Arial'
  };

  // Grid size based on the zoom level. (seconds)
  var GRIDS = [0.010, 0.020, 0.040, 0.080, 0.160, 0.320, 0.640, 1.280];

  function TimeRuler (ctx, x, y, width, height) {
    this.initialize(ctx, x, y, width, height);
  }

  TimeRuler.prototype.initialize = function (ctx, x, y, width, height) {
    this.gridDuration = GRIDS[5];
    this.gridSubdivision = 2;

    this.ctx = ctx;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = (height || STYLE.height);

    // Set font once.
    this.ctx.font = STYLE.rulerFont;
  };

  // length as in number of samples.
  TimeRuler.prototype.setBufferInfo = function (sampleRate, length) {
    this.bufferSampleRate = sampleRate;
    this.bufferLength = length;
  };

  TimeRuler.prototype.formatTime = function (second) {
    var sec = ~~second;
    var msec = ~~((second - sec) * 1000);
    return sec + '.' + msec;
  };

  // time, start time, total duration => a pixel position in width.
  TimeRuler.prototype.timeToPixel = function (time, start, totalDuration) {
    return (time - start) / totalDuration * this.width;
  };

  // start, end as in seconds.
  TimeRuler.prototype.draw = function (start, end) {
    
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
    this.ctx.lineWidth = STYLE.gridWidth;

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

})(Canopy = {}, window);