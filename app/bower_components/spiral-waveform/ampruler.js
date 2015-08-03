(function (SpiralWaveform) {

  var STYLE = {
    width: 38,
    height: 192,
    color: '#B0BEC5',
    colorShadow: '#78909C',
    gridHeight: 24,
    colorGrid: '#37474F',
    colorBorder: '#607D8B',
    font: '11px Arial'
  };

  /**
   * @class AmpRuler
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
    this.ctx.font = STYLE.font;
    this.gridGain = 0.2;
  };

  AmpRuler.prototype.setSize = function (width, height) {
    this.width = (width || STYLE.width);
    this.height = (height || STYLE.height);
    this.yCenter = this.height / 2;
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
    this.ctx.strokeStyle = STYLE.colorGrid;
    this.ctx.lineWidth = STYLE.gridLineWidth;
    this.ctx.textAlign = 'right';
    this.ctx.font = STYLE.font;

    // Push down.
    this.ctx.save();
    this.ctx.translate(this.x, this.y);

    // clear background and draw border.
    this.ctx.fillStyle = STYLE.color;
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.ctx.fillStyle = STYLE.colorShadow;
    this.ctx.fillRect(this.width - 1, 0, 1, this.height);

    // Draw grid.
    this.ctx.beginPath();
    this.ctx.fillStyle = STYLE.colorGrid;
    while (gain <= endGain) {
      yPos = this.gainToPixel(gain, absPeak);
      yNeg = this.gainToPixel(-gain, absPeak);
      
      if (yNeg < this.height - 4) {
        if (gain !== 0.0) {
          this.ctx.fillText(this.formatGain(gain), this.width * 0.8, yPos + 4);
          this.ctx.moveTo(this.width * 0.85, yPos);
          this.ctx.lineTo(this.width, yPos);
        }
        this.ctx.fillText(this.formatGain(-gain), this.width * 0.8, yNeg + 4);
        this.ctx.moveTo(this.width * 0.85, yNeg);
        this.ctx.lineTo(this.width, yNeg);
      }

      gain += this.gridGain;
    }
    this.ctx.stroke();

    // Draw bottom border.
    this.ctx.strokeStyle = STYLE.colorBorder;
    this.ctx.strokeRect(0, this.height, this.width, this.height);

    // Pop back up.
    this.ctx.restore();
  };

  SpiralWaveform.createAmpRuler = function (ctx, x, y, width, height) {
    return new AmpRuler(ctx, x, y, width, height);
  };

})(SpiralWaveform);