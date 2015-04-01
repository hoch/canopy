// MiniMap.js
(function (Canopy) {

  // MiniMap style.
  var STYLE = {
    height: 64,
    infoAreaHeight: 16,
    miniMapHeight: 48,
    color: '#4CAF50',
    colorBackground: '#ECEFF1',
    infoColor: '#1B5E20',
    infoFont: '10px Arial'
  };


  /**
   * @class MiniMap
   *
   * MiniMap has control over |waveformRenderer|. User interaction on the
   * minimap will cause the visual update on the waveform renderer(viewport
   * change).
   */
  function MiniMap(canvasId, controller) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');

    // App controller.
    this.controller = controller;

    this.renderedBuffer = null;
    this.needsRedraw = false;

    // Start/end point on canvas.
    this.regionStart = null;
    this.regionEnd = null;
    // Start/end points on audio sample.
    this.sampleStart = null;
    this.sampleEnd = null;

    // Registering Mouse handler.
    this.registerMouseHandler();

    // Start 60fps rendering loop.
    this.render();
  }

  MiniMap.prototype.clearCanvas = function () {
    this.ctx.fillStyle = STYLE.colorBackground;
    this.ctx.fillRect(0, 0, this.width, STYLE.height);
  };

  MiniMap.prototype.drawMiniMap = function () {
    if (!this.renderedBuffer)
      return;

    var pixelPerSample = this.width / this.renderedBuffer.length;
    var y_origin = STYLE.miniMapHeight * 0.5;
    var y_length;
    var x = 0, px = 0;

    // Styles.
    this.ctx.strokeStyle = STYLE.color;

    // Draw center line.
    this.ctx.beginPath();
    this.ctx.lineWidth = 0.5;
    this.ctx.moveTo(0, STYLE.miniMapHeight * 0.5);
    this.ctx.lineTo(this.width, STYLE.miniMapHeight * 0.5);
    this.ctx.stroke();

    // Draw waveform.
    this.ctx.beginPath();
    this.ctx.lineWidth = 1.0;
    // TO FIX: use both channel.
    var chanL = this.renderedBuffer.getChannelData(0);
    var maxSample, maxSampleIndex;
    for (var i = 0; i < chanL.length; i++) {
      // Find the max sample and index in sub-pixel sample elements.
      var sample = Math.abs(chanL[i]);
      if (maxSample < sample) {
        maxSample = sample;
        maxSampleIndex = i;
      }
      // Draw a line when it passes one pixel boundary.
      if (x - px >= 1) {
        y_length = (1 - chanL[maxSampleIndex]) * y_origin;
        this.ctx.moveTo(x, y_origin);
        this.ctx.lineTo(x, y_length);
        maxSample = 0;
        px = x;
      }
      x += pixelPerSample;
    }
    this.ctx.stroke();
  };

  MiniMap.prototype.drawInfo = function () {
    if (this.regionStart === this.regionEnd)
      return;

    this.ctx.lineWidth = 1.0;
    this.ctx.strokeStyle = STYLE.infoColor;
    this.ctx.fillStyle = STYLE.infoColor;
    this.ctx.font = STYLE.infoFont;
    this.ctx.textAlign = 'center';

    this.ctx.fillRect(this.regionStart, 0, 1, STYLE.miniMapHeight);
    this.ctx.fillRect(this.regionEnd, 0, 1, STYLE.miniMapHeight);
    this.ctx.fillText(this.sampleEnd - this.sampleStart,
      this.regionStart + (this.regionEnd - this.regionStart) * 0.5,
      STYLE.miniMapHeight * 0.8);

    if (this.sampleEnd - this.sampleStart > 3000) {
      this.ctx.fillText(this.sampleStart, this.regionStart, STYLE.miniMapHeight * 1.2);
      this.ctx.fillText(this.sampleEnd, this.regionEnd, STYLE.miniMapHeight * 1.2);
    }

    this.ctx.beginPath();
    this.ctx.moveTo(this.regionStart, STYLE.miniMapHeight * 0.51);
    this.ctx.lineTo(this.regionEnd, STYLE.miniMapHeight * 0.51);
    this.ctx.stroke();
  };

  MiniMap.prototype.drawRegion = function () {
    if (this.regionStart === null || this.regionEnd === null)
      return;

    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.fillRect(this.regionStart, 0,
      this.regionEnd - this.regionStart, STYLE.miniMapHeight);
  };

  // Render loop in 60fps.
  MiniMap.prototype.render = function () {
    if (this.needsRedraw) {
      this.clearCanvas();
      this.drawMiniMap();
      this.drawRegion();
      this.drawInfo();
      this.needsRedraw = false;
    }
    requestAnimationFrame(this.render.bind(this));
  };

  MiniMap.prototype.setBuffer = function (buffer) {
    this.renderedBuffer = buffer;
    this.needsRedraw = true;
  };

  // TO FIX: refactor setRegion method out of UI handler.
  MiniMap.prototype.setRegion = function (sampleStart, sampleEnd) {
    var factor = this.width / this.renderedBuffer.length;
    this.sampleStart = sampleStart;
    this.sampleEnd = sampleEnd;
    this.regionStart = this.sampleStart * factor;
    this.regionEnd = this.sampleEnd * factor;

    this.needsRedraw = true;
  };

  // On user interaction.
  MiniMap.prototype.onChange = function () {
    if (this.regionEnd - this.regionStart > 1) {
      var factor = this.renderedBuffer.length / this.width;
      this.sampleStart = Math.round(this.regionStart * factor);
      this.sampleEnd = Math.round(this.regionEnd * factor);

      // Notify change to controller.
      this.controller.notify('minimap', 'viewport-change', {
        start: this.sampleStart,
        end: this.sampleEnd
      });
    }

    this.needsRedraw = true;
  };

  // TO FIX: resizing should change the regionStart/End properly.
  MiniMap.prototype.onResize = function () {
    this.canvas.width = this.width = window.innerWidth - 520;
    this.canvas.height = STYLE.height;
    this.needsRedraw = true;
  };

  // Mouse handler.
  MiniMap.prototype.registerMouseHandler = function () {

    // 3x: origin, previous, delta.
    var ox, px, dx;

    // UI mode.
    var mode = 'MOVING'; // MOVING, CREATING

    // TO FIX: This needs some redesign.
    var mouseHandler = new MouseResponder('MiniMap', this.canvas,
      function (sender, action, data) {
        // console.log(action, data);

        switch (action) {

          case 'clicked':
            px = data.x;
            dx = 0;
            // Define behavior: MOVING or CREATING
            if (this.regionStart < data.x && data.x < this.regionEnd) {
              mode = 'MOVING';
            } else {
              ox = data.x;
              this.regionStart = data.x;
              this.regionEnd = data.x;
              mode = 'CREATING';
            }
            break;

          case 'dragged':
            dx = px - data.x;
            switch (mode) {
              case 'MOVING':
                var length = this.regionEnd - this.regionStart;

                // If the region is being dragged to the left end, clip the
                // delta x.
                if (this.regionStart - dx < 0) {
                  this.regionStart = 0;
                  this.regionEnd = length;
                  px = data.x;
                  return;
                }

                // IF the region is being dragged over the right end, clip the
                // delta x.
                if (this.regionEnd - dx > this.width-1) {
                  this.regionEnd = this.width - 1;
                  this.regionStart = this.regionEnd - length;
                  px = data.x;
                  return;
                }

                this.regionStart -= dx;
                this.regionEnd = this.regionStart + length;
                break;
              case 'CREATING':
                if (data.x < ox) {
                  this.regionStart = Math.max(data.x, 0);
                  this.regionEnd = ox;
                } else {
                  this.regionStart = ox;
                  this.regionEnd = Math.min(data.x, this.width-1);
                }
                break;
            }
            px = data.x;
            break;
        }

        // After user interaction, update the minimap.
        this.onChange();
      }.bind(this)
    );

  };


  // MiniMap factory.
  Canopy.createMiniMap = function (canvasId) {
    return new MiniMap(canvasId, Canopy);
  };

})(Canopy);


