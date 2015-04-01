/**
 * Waveform Renderer
 */
(function (Canopy) {

  // Styles.
  var STYLE = {
    height: 384,
    color: '#03A9F4',
    colorBackground: '#FFF',
    colorCenterLine: '#B0BEC5',
    rulerHeight: 30,
    rulerGridWidth: 1.0,
    rulerColor: '#37474F',
    rulerGridColor: '#CFD8DC',
    rulerFont: '9px Arial',
    infoColor: '#1B5E20',
    infoFont: '9px Arial'
  };

  // Grid size based on the zoom level. (in samples)
  var GRIDS = [10000, 2500, 500, 250, 100, 50, 25];
  var MAX_PPS = 5.0;

  /**
   * @class Waveform
   * @description A waveform renderer.
   */
  function Waveform(canvasId, controller) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');

    this.controller = controller;
    
    this.renderedBuffer = null;
    this.needsRedraw = false;

    // For view port.
    this.pixelPerSample = null;
    this.gridLevel = null;
    this.gridSize = null;
    this.viewStart = null;
    this.viewEnd = null;
    this.regionStart = null;
    this.regionEnd = null;

    // Registering Mouse handler.
    this.registerMouseHandler();

    // Start 60fps rendering loop.
    this.render();
  }

  Waveform.prototype.clearCanvas = function () {    
    this.ctx.fillStyle = STYLE.colorBackground;
    this.ctx.fillRect(0, 0, this.width, STYLE.height);
  };

  Waveform.prototype.drawRuler = function () {
    var nextGrid = this.viewStart + this.gridSize - (this.viewStart % this.gridSize);
    var x = 0;

    this.ctx.fillStyle = STYLE.rulerColor;
    this.ctx.strokeStyle = STYLE.rulerGridColor;
    this.ctx.lineWidth = STYLE.rulerGridWidth;

    this.ctx.fillRect(0, 0, this.width, STYLE.rulerHeight);

    this.ctx.beginPath();
    this.ctx.fillStyle = STYLE.rulerGridColor;
    this.ctx.font = STYLE.rulerFont;
    for (var i = this.viewStart; i < this.viewEnd; i++) {
      // Draw a grid when the buffer index passes the grid position.
      if (i >= nextGrid) {
        this.ctx.fillText(nextGrid, x, 15);
        this.ctx.moveTo(x, 20);
        this.ctx.lineTo(x, 28.5);
        nextGrid += this.gridSize;
      }
      x += this.pixelPerSample;
    }
    this.ctx.stroke();
  };

  Waveform.prototype.drawWaveform = function () {
    if (!this.renderedBuffer)
      return;
    
    // -3 for upper padding.
    var height = STYLE.height - STYLE.rulerHeight - 3;

    var y_origin = height * 0.5;
    var y_length;
    var x = 0, px = 0;

    this.ctx.save();

    // +1.5 for lower padding.
    this.ctx.translate(0, STYLE.rulerHeight + 1.5);

    // Draw center line.
    this.ctx.beginPath();
    this.ctx.strokeStyle = STYLE.colorCenterLine;
    this.ctx.moveTo(0, height * 0.5);
    this.ctx.lineTo(this.width, height * 0.5);
    this.ctx.stroke();

    // Draw waveform.
    this.ctx.beginPath();
    this.ctx.strokeStyle = this.ctx.fillStyle = STYLE.color;
    var chanL = this.renderedBuffer.getChannelData(0);
    var maxSample, maxSampleIndex;
    for (var i = this.viewStart; i < this.viewEnd; i++) {
      // Find the max sample and index in sub-pixel sample elements.
      var sample = Math.abs(chanL[i]);
      if (maxSample < sample) {
        maxSample = sample;
        maxSampleIndex = i;
      }
      // Draw only when the advance is bigger than one pixel.
      if (x - px >= 1) {
        y_length = (1 - chanL[maxSampleIndex]) * y_origin;
        this.ctx.lineTo(x, y_length);
        // Draw sample dots beyond 1.5x zoom.
        if (this.pixelPerSample > 1.5)
          this.ctx.fillRect(x - 1.5, y_length - 1.5, 3, 3);
        maxSample = 0;
        px = x;
      }
      x += this.pixelPerSample;
    }
    this.ctx.stroke();

    this.ctx.restore();
  };

  Waveform.prototype.drawInfo = function () {
    // if (this.regionStart === this.regionEnd)
    //   return;

    // this.ctx.lineWidth = 1.0;
    // this.ctx.font = '10px Arial';
    // this.ctx.textAlign = 'center';
    
    
    // this.ctx.beginPath();    
    // this.ctx.moveTo(this.regionStart, STYLE.WaveformHeight + STYLE.infoAreaHeight * 0.4);
    // this.ctx.lineTo(this.regionEnd, STYLE.WaveformHeight + STYLE.infoAreaHeight * 0.4);
    // this.ctx.fillRect(this.regionEnd, STYLE.WaveformHeight + STYLE.infoAreaHeight * 0.1, 1, STYLE.infoAreaHeight * 0.3);

    // // TO FIX: this info should come from audio engine (sample or time)
    // this.ctx.fillText(this.regionEnd - this.regionStart, this.regionStart + (this.regionEnd - this.regionStart) * 0.5, STYLE.WaveformHeight + STYLE.infoAreaHeight);
    // this.ctx.stroke();
  };

  // TO FIX: 
  Waveform.prototype.drawRegion = function () {
    // Do not draw if the region length is 0.
    if (this.regionStart === this.regionEnd)
      return;

    // this.ctx.strokeStyle = STYLE.infoColor;
    // this.ctx.fillStyle = STYLE.infoColor;
    
    // this.ctx.save();
    // this.ctx.translate(0, STYLE.rulerHeight + 1);
    // this.ctx.strokeRect(this.regionStart, 0.5, 
    //   this.regionEnd - this.regionStart, STYLE.height - STYLE.rulerHeight - 2.0);
    // this.ctx.restore();
  };

  // TO FIX: 
  Waveform.prototype.selectRegion = function (x1, x2) {
    if (x1 === x2)
      return;

    // We don't know which point is the starting point. Compare and swap them
    // if necessary.
    if (x1 < x2) {
      this.regionStart = x1;
      this.regionEnd = x2;
    } else {
      this.regionStart = x2;
      this.regionEnd = x1;
    }

    this.needsRedraw = true;
  };

  // TO FIX: viewStart - viewEnd should not be negative value.
  Waveform.prototype.zoom = function (deltaY, anchorX) {
    var factor = deltaY / this.pixelPerSample / this.width * 10;
    this.viewStart -= Math.round(factor * anchorX);
    this.viewEnd += Math.round(factor * (this.width - anchorX));
    this.viewStart = Math.max(this.viewStart, 0);
    this.viewEnd = Math.min(this.viewEnd, this.renderedBuffer.length);
    this.updateViewPort();
    this.onChange();
  };

  // TO FIX: clamping pixelPerSample and other viewport related values.
  Waveform.prototype.updateViewPort = function () {
    this.pixelPerSample = this.width / (this.viewEnd - this.viewStart);    
    this.gridLevel = Math.round(20 * Math.log10(this.pixelPerSample + 1));
    this.gridLevel = Math.min(6, this.gridLevel);
    this.gridSize = GRIDS[this.gridLevel];
    
    this.needsRedraw = true;
  };

  Waveform.prototype.setViewPort = function (viewStart, viewEnd) {
    this.viewStart = Math.round(viewStart);
    this.viewEnd = Math.round(viewEnd);
    this.updateViewPort();
  };

  // Render loop in 60fps.
  Waveform.prototype.render = function () {
    if (this.needsRedraw) {
      this.clearCanvas();
      this.drawRuler();
      this.drawWaveform();
      this.drawRegion();
      this.drawInfo();
      this.needsRedraw = false;
    }

    requestAnimationFrame(this.render.bind(this));
  };

  Waveform.prototype.setBuffer = function (buffer) {
    this.renderedBuffer = buffer;
    this.viewStart = 0;
    this.viewEnd = this.renderedBuffer.length;
    this.updateViewPort();
  };

  Waveform.prototype.onChange = function () {
    // Notify change to controller.
    // TO FIX: viewStart - viewEnd should not be negative value.
    this.controller.notify('waveform', 'viewport-change', {
      start: this.viewStart,
      end: this.viewEnd
    });

    this.needsRedraw = true;
  };

  Waveform.prototype.onResize = function () {
    this.canvas.width = this.width = window.innerWidth - 
      Canopy.STYLE.editorWidth - Canopy.STYLE.viewPadding;
    this.canvas.height = STYLE.height;
    this.updateViewPort();
  };

  Waveform.prototype.registerMouseHandler = function () {

    // origin, previous, delta.
    var ox;
    var px, py, dx, dy;

    // UI mode = {ZOOMING, SELECTING}
    var mode;

    var mouseHandler = new MouseResponder('Waveform', this.canvas,
      function (sender, action, data) {
        // console.log(action, data);
        
        switch (action) {
          
          case 'clicked':
            ox = data.x;
            px = data.x;
            py = data.y;
            dx = dy = 0;
            break;

          case 'dragged':
            dx = px - data.x;
            dy = py - data.y;
            mode = (dx * dx < dy * dy) ? 'ZOOMING' : 'SELECTING';
            switch (mode) {
              case 'ZOOMING':
                this.zoom(dy, data.x);
                
                // // If the region is being dragged to the left end, clip the 
                // // delta x.
                // if (this.regionStart - dx < 0) {
                //   this.regionStart = 0;
                //   this.regionEnd = length;
                //   px = data.x;
                //   return;
                // }

                // // IF the region is being dragged over the right end, clip the 
                // // delta x.
                // if (this.regionEnd - dx > this.width - 1) {
                //   this.regionEnd = this.width - 1;
                //   this.regionStart = this.regionEnd - length;
                //   px = data.x;
                //   return;
                // }

                // this.regionStart -= dx;
                // this.regionEnd = this.regionStart + length;
                break;
              case 'SELECTING':
                this.selectRegion(ox, data.x);
                break;
            }
            px = data.x;
            py = data.y;
            break;
        }
        
        // // After user interaction, update the minimap.
        
      }.bind(this)
    );

  };


  // MiniMap factory.
  Canopy.createWaveform = function (canvasId) {
    return new Waveform(canvasId, Canopy);
  };

})(Canopy);