/**
 * @license MIT License. Copyright (c) 2015 Hongchan Choi. All rights reserved.
 */

/**
 * @closure AmpRuler
 * @description A submodule class of spiral-waveform for rendering amplitude
 *              ruler. Offers a nicely arranged grids and fluid zoom-in and out.
 */

(function (SpiralWaveform) {

  'use strict';

  var STYLE = {
    width: 38,
    height: 192,
    color: '#B0BEC5',
    colorShadow: '#78909C',
    gridHeight: 36,
    colorGrid: '#37474F',
    colorBorder: '#607D8B',
    font: '10px Arial'
  };

  function AmpRuler(ctx, x, y, width, height) {
    this._initialize(ctx, x, y, width, height);
  }

  AmpRuler.prototype._initialize = function(ctx, x, y, width, height) {
    this._ctx = ctx;
    this.x = x;
    this.y = y;
    this.width = (width || STYLE.width);
    this.height = (height || STYLE.height);

    // Grid drawing specific.
    this._currentGridPositions = new Map();

    this._needsRedraw = true;
    this._isInitialized = true;
  };

  // Get the current size.
  AmpRuler.prototype.getSize = function () {
    return {
      x: x,
      y: y,
      width: width,
      height: height
    };
  };

  // To resize the module.
  AmpRuler.prototype.setSize = function (width, height) {
    if (!this._isInitialized)
      return;

    this.width = (width || STYLE.width);
    this.height = (height || STYLE.height);

    // TODO: AmpRuler is sharing the canvas with Waveform, so canvas size cannot
    // be adjusted here. A bad design!
  };

  // Returns the current grid information.
  AmpRuler.prototype.getCurrentGrids = function () {
    if (!this._isInitialized)
      return null;

    // TODO: This is unsafe. Find a better way to share the state with other
    // submodules.
    return this._currentGridPositions;
  };

  // Update grids based the maximum display gain.
  AmpRuler.prototype.update = function (maxDisplayGain) {
    if (!this._isInitialized)
      return;

    // Calculate a nicely arranged grid unit.
    var gridGain = _calculateGridUnit(maxDisplayGain, this.height, STYLE.gridHeight);
    
    // The start gain is always zero because the origin of graph does not change
    // for AmpRuler.
    var startGain = 0;
    var endGridRemainder = (maxDisplayGain % gridGain)
    var endGain = maxDisplayGain + gridGain - endGridRemainder;
    var yPos, yNeg;

    // Clear the current grid positions.
    this._currentGridPositions.clear();

    while (startGain <= endGain) {
      // Calculate y coords (positive) of startGain and add to the map.
      this._currentGridPositions.set(startGain,
        _gainToPixel(startGain, maxDisplayGain, this.height));

      // Calculate y coords (negative) of -startGain and add to the map. Skip
      // it if the start gain is zero. Otherwise the grid at zero will be drawn
      // twice.
      if (startGain !== 0)
        this._currentGridPositions.set(-startGain,
          _gainToPixel(-startGain, maxDisplayGain, this.height));

      startGain += gridGain;
    }

    // The grid position is changed, so it needs redraw.
    this._needsRedraw = true;
  };

  // Draw grids on canvas.
  AmpRuler.prototype.draw = function(absPeak) {
    // If the grid does not need redraw, stop here.
    if (!this._needsRedraw || !this._isInitialized)
      return;

    // Prepare for drawing.
    this._ctx.fillStyle = STYLE.color;
    this._ctx.strokeStyle = STYLE.colorGrid;
    this._ctx.lineWidth = STYLE.gridLineWidth;
    this._ctx.textAlign = 'right';
    this._ctx.font = STYLE.font;

    // Push down and translate.
    this._ctx.save();
    this._ctx.translate(this.x, this.y);
    this._ctx.rect(0, 0, this.width, this.height);
    this._ctx.clip();
    
    // clear background and draw border.
    this._ctx.fillStyle = STYLE.color;
    this._ctx.fillRect(0, 0, this.width, this.height);
    
    // Draw grids.
    this._ctx.beginPath();
    this._ctx.fillStyle = STYLE.colorGrid;

    this._currentGridPositions.forEach(function (y, gain) {
      this._ctx.fillText(gain.toFixed(3), this.width * 0.8, y + 3);
      this._ctx.moveTo(this.width * 0.875, y);
      this._ctx.lineTo(this.width, y);
    }.bind(this));
    
    this._ctx.stroke();

    // Draw borders.
    this._ctx.fillStyle = STYLE.colorShadow;
    this._ctx.fillRect(this.width - 1, 0, 1, this.height);

    // Pop back up.
    this._ctx.restore();

    // It has been drawn, flip the flag.
    this._needsRedraw = false;
  };


  /** Static Utilities **/

  // Convert a gain value (-1.0 ~ 1.0) based on the maximum display gain and
  // the view port height.
  // TODO: ambiguous!
  function _gainToPixel(gain, maxDisplayGain, height) {
    return (1 - (gain / maxDisplayGain)) * height * 0.5;
  }

  // Calculate a nicely sized grid unit based on the current zoom level and a
  // suggested grid height. |gridHeight| is in pixels.
  // TODO: Refactor this method with TimeRuler.
  //
  // Largely based on: http://stackoverflow.com/questions/8506881
  function _calculateGridUnit(maxDisplayGain, height, gridHeight) {
    // An maximum display gain divided by the max number of grids. |height|
    // needs to be half because the drawer will use the half to mirror across
    // y = 0.
    // 
    // 1000 is arbitrary.
    var range = maxDisplayGain * 1000
    var rangeOverNumberOfGrids = range / ~~(height * 0.5 / gridHeight);

    var exponent = ~~Math.log10(rangeOverNumberOfGrids);
    var niceFraction = Math.pow(10, exponent);
    var fraction = rangeOverNumberOfGrids / niceFraction;

    if (fraction < 1.5)
      niceFraction *= 1;
    else if (fraction < 3)
      niceFraction *= 2;
    else if (fraction < 7)
      niceFraction *= 5;
    else
      niceFraction *= 10;

    // Return the calculated grid unit (in gain).
    return niceFraction / 1000;
  }


  /** Factory **/

  SpiralWaveform.createAmpRuler = function (ctx, x, y, width, height) {
    return new AmpRuler(ctx, x, y, width, height);
  };

})(SpiralWaveform);
