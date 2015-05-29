(function (Canopy) {

  var STYLE = {
    width: 38,
    height: 192,
    color: '#37474F',
    gridHeight: 32,
    gridColor: '#CFD8DC',
    font: '11px Arial'
  };

  /**
   * @class AmpRuler
   * 
   */
  function AmpRuler(ctx, x, y, width, height) {
    this.initialize(ctx, x, y, width, height);
  }

  AmpRuler.prototype.initialize = function(ctx, x, y, width, height) {
    this.ctx = ctx;
    this.x = x;
    this.y = y;
    this.width = (width || STYLE.width);
    this.height = (height || STYLE.height);
    this.yCenter = this.height / 2;

    // Set font once.
    this.ctx.font = STYLE.rulerFont;
    this.gridGain = 0.2;
  };

  AmpRuler.prototype.formatGain = function(gain) {
    return gain.toFixed(2);
  };

  // gain, absPeak => a pixel position in height.
  AmpRuler.prototype.gainToPixel = function (gain, absPeak) {
    return (-(gain / absPeak) + 1) * this.yCenter;
  };

  AmpRuler.prototype.calculateGrid = function(absPeak) {
    // An absolute peak divided by the max number of grids.
    // 1000 is just a factor to get nice grids.
    var range = absPeak * 1000 / (~~(this.yCenter / STYLE.gridHeight) - 1);

    // This is from: http://stackoverflow.com/questions/8506881/
    var exponent = ~~(Math.log10(range));
    var fraction = range / Math.pow(10, exponent);
    var niceFraction = Math.pow(10, exponent);
    
    if (fraction < 1.5)
      niceFraction *= 1;
    else if (fraction < 3)
      niceFraction *= 2;
    else if (fraction < 7)
      niceFraction *= 5;
    else
      niceFraction *= 10;
    
    this.gridGain = niceFraction / 1000;
  };

  // The argument is an absolute peak (maximum value) of the ruler.
  AmpRuler.prototype.draw = function(absPeak) {

    // TO FIX: optimize this.
    this.calculateGrid(absPeak);

    // Set up parameters: going from |gain| to |endGain|.
    var gain = 0;
    var endGain = absPeak - (absPeak % this.gridGain);
    var yPos, yNeg;

    // Prepare for drawing.
    this.ctx.fillStyle = STYLE.color;
    this.ctx.strokeStyle = STYLE.gridColor;
    this.ctx.lineWidth = STYLE.gridLineWidth;
    this.ctx.textAlign = 'right';

    // Push down.
    this.ctx.save();
    this.ctx.translate(this.x, this.y);

    // clear background for ruler.
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Draw grid.
    this.ctx.beginPath();
    this.ctx.fillStyle = STYLE.gridColor;
    while (gain <= endGain) {
      yPos = this.gainToPixel(gain, absPeak);
      yNeg = this.gainToPixel(-gain, absPeak);
      this.ctx.fillText(this.formatGain(gain), STYLE.width * 0.75, yPos + 4);
      this.ctx.fillText(this.formatGain(-gain), STYLE.width * 0.75, yNeg + 4);
      this.ctx.moveTo(STYLE.width * 0.8, yPos);
      this.ctx.lineTo(STYLE.width, yPos);
      this.ctx.moveTo(STYLE.width * 0.8, yNeg);
      this.ctx.lineTo(STYLE.width, yNeg);
      gain += this.gridGain;
    }
    this.ctx.stroke();

    // Pop back up.
    this.ctx.restore();
  };

  Canopy.createAmpRuler = function (ctx, x, y, width, height) {
    return new AmpRuler(ctx, x, y, width, height);
  };

})(Canopy);