/**
 * @license MIT License. Copyright (c) 2015 Hongchan Choi. All rights reserved.
 */


/**
 * @global SpiralWaveform
 * @description A global name space for All spiral-waveform JS submodules.
 *              timeruler.js MUST be loaded at first. (TODO)
 */

var SpiralWaveform = {};


/**
 * @closure TimeRuler
 * @description A submodule class of spiral-waveform for rendering time line.
 *              Offers a nicely arranged grids and fluid zoom-in and out.
 */

(function (SpiralWaveform) {

  'use strict';

  var STYLE = {
    width: 400,
    height: 32,
    color: '#B0BEC5',
    colorShadow: '#78909C',
    gridWidth: 96,
    gridLineWidth: 1.0,
    gridColor: '#263238',
    font: '11px Arial'
  };

  function TimeRuler(ctx, x, y, width, height) {
    this._initialize(ctx, x, y, width, height);
  }

  TimeRuler.prototype._initialize = function (ctx, x, y, width, height) {
    this._ctx = ctx;
    this.x = x;
    this.y = y;
    this.width = (width || STYLE.width);
    this.height = (height || STYLE.height);

    // Grid drawing specific.
    this._currentGridPositions = new Map();
    this._currentGridDuration = null;

    this._needsRedraw = true;
    this._isInitialized = true;
  };

  // Get the current size.
  TimeRuler.prototype.getSize = function () {
    return {
      x: x,
      y: y,
      width: width,
      height: height
    };
  };

  // To resize the module.
  TimeRuler.prototype.setSize = function (width, height) {
    if (!this._isInitialized)
      return;

    this.width = (width || STYLE.width);
    this.height = (height || STYLE.height);
  };

  TimeRuler.prototype.getGridDuration = function () {
    return this._currentGridDuration;
  };

  // Returns the current grid information.
  TimeRuler.prototype.getCurrentGrids = function () {
    if (!this._isInitialized)
      return null;

    // TODO: This is unsafe. Find a better way to share the state with other
    // submodules.
    return this._currentGridPositions;
  };

  TimeRuler.prototype.getSecondsFromDeltaX = function (deltaX, start, end) {
    return _pixelToSecond(deltaX, start, end, this.width)
  };

  // Update grids based on start, end time.
  TimeRuler.prototype.update = function (start, end) {
    if (!this._isInitialized)
      return;

    // Calculate a nicely arranged grid unit.
    var gridDuration = _calculateGridUnit(start, end, this.width, STYLE.gridWidth);
    var totalDuration = end - start;

    // The time position of start and end grids.
    var startGrid, endGrid;

    var startGridRemainder = (start % gridDuration);
    var endGridRemainder = (end % gridDuration);
    startGrid = start - startGridRemainder;
    endGrid = end + gridDuration - endGridRemainder;

    // Clear the current grid positions.
    this._currentGridPositions.clear();

    // |startGrid| advances per grid duration for every iteration. Store a key-
    // value pair of { startGrid: xPos }.
    while (startGrid <= endGrid) {
      this._currentGridPositions.set(startGrid,
        _secondToPixel(startGrid, start, totalDuration, this.width));
      startGrid += gridDuration;
    }

    // Update the current duration for other elements to use.
    this._currentGridDuration = gridDuration;

    // The grid position is changed, so it needs redraw.
    this._needsRedraw = true;
  };

  // Draw grids on canvas.
  TimeRuler.prototype.draw = function () {
    // If the grid does not need redraw, stop here.
    if (!this._needsRedraw || !this._isInitialized)
      return;

    // Prepare for drawing.
    this._ctx.fillStyle = STYLE.color;
    this._ctx.strokeStyle = STYLE.gridColor;
    this._ctx.lineWidth = STYLE.gridLineWidth;
    this._ctx.font = STYLE.font;
    this._ctx.textAlign = 'left';

    // Push, translate, clip.
    this._ctx.save();
    this._ctx.translate(this.x, this.y);
    this._ctx.rect(0, 0, this.width, this.height);
    this._ctx.clip();

    // clear background.
    this._ctx.fillStyle = STYLE.color;
    this._ctx.fillRect(0, 0, this.width, this.height);

    // Draw grids.
    this._ctx.beginPath();
    this._ctx.fillStyle = STYLE.gridColor;

    this._currentGridPositions.forEach(function (x, time) {
      this._ctx.fillText(time.toFixed(3), x, this.height * 0.5);
      this._ctx.moveTo(x, this.height * 0.7);
      this._ctx.lineTo(x, this.height);
    }.bind(this));

    this._ctx.stroke();

    // Draw the bottom border.
    this._ctx.fillStyle = STYLE.colorShadow;
    this._ctx.fillRect(0, this.height - 1, this.width, 1);

    // Pop back up.
    this._ctx.restore();

    // It has been drawn, flip the flag.
    this._needsRedraw = false;
  };


  /** Static Utilities **/

  // Convert the |second| position based on start time, total duration, width in
  // pixels.
  function _secondToPixel(second, start, duration, width) {
    return (second - start) / duration * width;
  };

  // Convert a position in pixels to a time value based on start, end, width in
  // pixels.
  function _pixelToSecond(pixel, start, end, width) {
    return pixel * (end - start) / width ;
  };

  // Calculate a nicely sized grid unit based on the time range and a suggested
  // grid width. start and end are in seconds, viewWidth and gridWidth is in
  // pixels.
  // TODO: Refactor this method with AmpRuler.
  //
  // Largely based on: http://stackoverflow.com/questions/8506881
  function _calculateGridUnit(start, end, viewWidth, gridWidth) {
    var range = (end - start) * 1000;
    var rangeOverNumberOfGrids = range / ~~(viewWidth / gridWidth);

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

    // Return the calculated grid unit duration in seconds.
    return niceFraction / 1000;
  };


  /** Factory **/

  SpiralWaveform.createTimeRuler = function (ctx, x, y, width, height) {
    return new TimeRuler(ctx, x, y, width, height);
  };

})(SpiralWaveform );
