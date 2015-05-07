/**
 * Waveform Renderer
 */
(function (Canopy) {

  // Styles.
  var STYLE = {
    height: 192, // Height of single channel rendering.
    color: '#03A9F4',
    colorClipped: '#E91E63',
    colorBackground: '#FFF',
    colorCenterLine: '#B0BEC5',
    rulerHeight: 32,
    rulerGridWidth: 1.0,
    rulerColor: '#37474F',
    rulerGridColor: '#CFD8DC',
    rulerFont: '11px Arial',
    ampRulerWidth: 38,
    ampRulerFont: '10px Arial',
    infoColor: '#1B5E20',
    infoFont: '12px Arial',
    padding: 2.4
  };

  // Grid size based on the zoom level. (in samples)
  // var GRIDS = [10000, 2048, 512, 256, 128, 64, 32];
  var GRIDS = [10000, 3200, 800, 400, 200, 100, 50];
  var MIN_SAMPLES_IN_VIEWPORT = 128;


  /**
   * @class Waveform
   * @description A waveform renderer.
   */
  function Waveform(canvasId, controller) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');

    // Offscreen canvas and context.
    this.canvasOS = document.createElement('canvas');
    this.ctxOS = this.canvasOS.getContext('2d');

    this.controller = controller;

    this.renderedBuffer = null;
    this.isOSChanged = false;
    this.needsRedraw = false;

    // For view port.
    this.width = 0;
    this.height = 0;
    this.pixelPerSample = null;
    this.gridLevel = null;
    this.gridSize = null;
    this.gridDisplayMode = 'seconds';

    // View port in samples.
    this.viewStart = null;
    this.viewEnd = null;

    // User-selected region in pixels.
    this.regionStart = null;
    this.regionEnd = null;

    // Registering Mouse handler.
    this.registerMouseHandler();

    // Start 60fps rendering loop.
    this.render();
  }

  Waveform.prototype.clearCanvas = function () {
    this.ctx.fillStyle = this.ctxOS.fillStyle = STYLE.colorBackground;
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.ctxOS.fillRect(0, 0, this.width, this.height);
  };

  Waveform.prototype.drawRuler = function () {

    // Draw time axis.
    var nextGrid = this.viewStart + this.gridSize - (this.viewStart % this.gridSize);
    var x = STYLE.ampRulerWidth;

    this.ctxOS.fillStyle = STYLE.rulerColor;
    this.ctxOS.strokeStyle = STYLE.rulerGridColor;
    this.ctxOS.lineWidth = STYLE.rulerGridWidth;

    this.ctxOS.fillRect(0, 0, this.width, STYLE.rulerHeight);

    this.ctxOS.beginPath();
    this.ctxOS.fillStyle = STYLE.rulerGridColor;
    this.ctxOS.font = STYLE.rulerFont;
    for (var i = this.viewStart; i < this.viewEnd; i++) {
      // Draw a grid when the buffer index passes the grid position.
      if (i >= nextGrid) {
        if (this.gridDisplayMode === 'seconds') {
          this.ctxOS.fillText(this.getTimeFromSample(nextGrid), x, 15);
        } else {
          this.ctxOS.fillText(nextGrid, x, 15);
        }
        this.ctxOS.moveTo(x, 20);
        this.ctxOS.lineTo(x, 30);
        nextGrid += this.gridSize;
      }
      x += this.pixelPerSample;
    }
    this.ctxOS.stroke();

    // Draw amplitude/decibel axis.
    this.ctxOS.fillStyle = STYLE.rulerColor;
    this.ctxOS.strokeStyle = STYLE.rulerGridColor;
    this.ctxOS.lineWidth = STYLE.rulerGridWidth;
  };

  Waveform.prototype.drawAmpRuler = function () {
    // TO FIX: abstract/optimize this.
    // NOTE: this draw routine is inside of translation stack.
    
    // upper bound (amplitude)
    var viewUpperBound = 1.0; // [-1.0, 1.0]

    // grid (amplitude)
    var gridSize = 0.5;
    var gridSubdivision = 2;
    var subdivSize = gridSize / gridSubdivision;

    var rulerWidth = STYLE.ampRulerWidth; // pixel
    var rulerHeight = STYLE.height; // pixel
    var axisCenter = rulerHeight * 0.5; // pixel
    var gainPerPixel = (viewUpperBound * 2) / rulerHeight;

    this.ctxOS.fillStyle = '#CFD8DC';
    this.ctxOS.fillRect(0, -1, rulerWidth, rulerHeight + 2);

    this.ctxOS.fillStyle = '#263238';
    this.ctxOS.font = STYLE.ampRulerFont;

    var nextGain = 0;
    while (nextGain <= viewUpperBound) {

      var ypos = Math.round(axisCenter + nextGain / gainPerPixel);
      var yneg = Math.round(axisCenter - nextGain / gainPerPixel);

      if (~~(nextGain / gridSize) !== nextGain / gridSize) {
        this.ctxOS.fillRect(28, ypos, 10, 0.5);
        this.ctxOS.fillRect(28, yneg, 10, 0.5);
      } else {
        this.ctxOS.fillRect(22, ypos, 16, 1);
        this.ctxOS.fillRect(22, yneg, 16, 1);
        // Render text
        if (nextGain === 0.0) {
          this.ctxOS.fillText(nextGain.toFixed(1), 4, yneg + 5);  
        } else {
          this.ctxOS.fillText(nextGain.toFixed(1), 20, yneg + 12);
          this.ctxOS.fillText('-' + nextGain.toFixed(1), 20, ypos - 2.5);
        }
      }

      nextGain += subdivSize;
    }
  };

  Waveform.prototype.drawWaveform = function () {
    if (!this.renderedBuffer)
      return;

    this.ctxOS.save();

    // Ruler height.
    this.ctxOS.translate(0, STYLE.rulerHeight);

    // Iterate channels.
    for (var channel = 0; channel < this.renderedBuffer.numberOfChannels; channel++) {
      var data = this.renderedBuffer.getChannelData(channel);
      var y_origin = STYLE.height * 0.5;
      var y_length;
      var x = STYLE.ampRulerWidth, px = -1, i;

      // Translate: padding + channel height
      this.ctxOS.save();
      this.ctxOS.translate(0, (STYLE.padding * (channel + 1)) + STYLE.height * channel);

      // Draw center line.
      this.ctxOS.beginPath();
      this.ctxOS.strokeStyle = STYLE.colorCenterLine;
      this.ctxOS.moveTo(0, STYLE.height * 0.5);
      this.ctxOS.lineTo(this.width, STYLE.height * 0.5);
      this.ctxOS.stroke();

      // Draw waveform.
      this.ctxOS.strokeStyle = this.ctxOS.fillStyle = STYLE.color;
      this.ctxOS.beginPath();

      var posSample = 0.0, negSample = 0.0, sample;
      var maxSampleIndex;
      var y_posOffset, y_negOffset;

      // If PPS is smaller than 1.0 (zoomed-out), use sub-sampling to draw.
      // Otherwise, use super-sampling and interpolation with lineTo().
      if (this.pixelPerSample <= 1.0) {

        for (i = this.viewStart; i < this.viewEnd; i++) {
          // Pick each sample from positive and negative values.
          sample = data[i];
          if (sample > posSample)
            posSample = sample;
          else if (sample < negSample)
            negSample = sample;

          // Draw only when the advance is bigger than one pixel.
          if (x - px >= 1) {
            posSample = Math.min(1.0, posSample);
            negSample = Math.max(-1.0, negSample);

            // Draw the positive sample.
            y_posOffset = (1 - posSample) * y_origin;
            y_negOffset = (1 - negSample) * y_origin;

            this.ctxOS.moveTo(x, y_posOffset);
            this.ctxOS.lineTo(x, y_origin);
            this.ctxOS.lineTo(x, y_negOffset);

            posSample = negSample = 0.0;
            px = x;
          }
          x += this.pixelPerSample;
        }
      } else {
        for (i = this.viewStart; i < this.viewEnd; i++) {
          // Find the max sample and index in sub-pixel sample elements.
          sample = Math.abs(data[i]);
          if (sample > posSample) {
            posSample = sample;
            maxSampleIndex = i;
          }
          // Draw only when the advance is bigger than one pixel.
          if (x - px >= 1) {
            y_length = (1 - data[maxSampleIndex]) * y_origin;
            this.ctxOS.lineTo(x, y_length);
            // Draw sample dots beyond 1.25x zoom.
            if (this.pixelPerSample > 1.25)
              this.ctxOS.fillRect(x - 1.5, y_length - 1.5, 3, 3);
            posSample = 0;
            px = x;
          }
          x += this.pixelPerSample;
        }
      }

      this.ctxOS.stroke();

      // Paint amp ruler section.
      this.drawAmpRuler();

      // Restoring from: padding + channel height
      this.ctxOS.restore();
    }

    this.ctxOS.restore();
  };

  Waveform.prototype.copyOSCanvas = function () {
    // Copy OS.
    this.ctx.drawImage(this.ctxOS.canvas,
      0, 0, this.width, this.height);
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

  Waveform.prototype.zoom = function (deltaY, anchorX) {

    // 10 is a scaling factor.
    var factor = deltaY / this.pixelPerSample / this.width * 10;

    // Estimate start/end points.
    var start = this.viewStart - Math.round(factor * anchorX);
    var end = this.viewEnd + Math.round(factor * (this.width - anchorX));
    start = Math.max(start, 0);
    end = Math.min(end, this.renderedBuffer.length);

    // Only works beyond MIN_SAMPLES_IN_VIEWPORT.
    if (end - start > MIN_SAMPLES_IN_VIEWPORT) {
      this.viewStart = start;
      this.viewEnd = end;

      // Notify app controller the view port change.
      this.onChange('viewport-change', {
        start: this.viewStart,
        end: this.viewEnd
      });

      this.updateViewPort();
    }
  };

  Waveform.prototype.pan = function (deltaX) {

    var disp = Math.round(deltaX / this.pixelPerSample);

    // Estimate start/end points.
    var start = this.viewStart + disp;
    var end = start + (this.viewEnd - this.viewStart);

    // Only works with valid start/end points.
    if (0 <= start && end < this.renderedBuffer.length) {
      this.viewStart = start;
      this.viewEnd = end;

      // Notify app controller the view port change.
      this.onChange('viewport-change', {
        start: this.viewStart,
        end: this.viewEnd
      });

      this.updateViewPort();
    }
  };

  Waveform.prototype.updateViewPort = function () {
    this.pixelPerSample = (this.width - STYLE.ampRulerWidth) / (this.viewEnd - this.viewStart);
    this.gridLevel = Math.round(20 * Math.log10(this.pixelPerSample + 1));
    this.gridLevel = Math.min(6, this.gridLevel);
    this.gridSize = GRIDS[this.gridLevel];

    // Changing view port triggers the redraw of offscreen waveform.
    this.isOSChanged = true;

    // The OS change always triggers the complete redraw.
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
      if (this.isOSChanged) {
        this.drawWaveform();
        this.drawRuler();
        this.isOSChanged = false;
      }
      this.copyOSCanvas();
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

    // OS should be changed.
    this.isOSChanged = true;

    this.onResize();
    this.updateViewPort();
  };

  // Notify change to controller.
  Waveform.prototype.onChange = function (eventType, data) {
    this.controller.notify('waveform', eventType, data);
  };

  Waveform.prototype.onResize = function () {

    var numberOfChannels = 1;
    if (this.renderedBuffer)
      numberOfChannels = this.renderedBuffer.numberOfChannels;

    this.width = window.innerWidth - Canopy.STYLE.editorWidth - Canopy.STYLE.viewPadding;
    this.height = STYLE.rulerHeight + (STYLE.padding + STYLE.height) * numberOfChannels;

    this.canvas.width = this.canvasOS.width = this.width;
    this.canvas.height = this.canvasOS.height = this.height;
    
    this.updateViewPort();
  };

  Waveform.prototype.registerMouseHandler = function () {

    // UI mode = {ZOOM, PAN, SELECT}
    var mode;

    // origin, previous, delta.
    var ox;
    var px, py, dx, dy;

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
            mode = (dx * dx < dy * dy) ? 'ZOOM' : 'PAN';
            switch (mode) {
              case 'ZOOM':
                this.zoom(dy, data.x);
                break;
              case 'PAN':
                this.pan(dx);
                break;
            }
            px = data.x;
            py = data.y;
            break;
        }
      }.bind(this)
    );

  };

  Waveform.prototype.getTimeFromSample = function (samples) {
    if (!this.renderedBuffer)
      return null;

    var seconds = samples / this.renderedBuffer.sampleRate;
    var sec = Math.floor(seconds);
    var msec = Math.floor((seconds - sec) * 1000);
    return sec + '.' + msec;
  };


  // Waveform factory.
  Canopy.createWaveform = function (canvasId) {
    return new Waveform(canvasId, Canopy);
  };

})(Canopy);