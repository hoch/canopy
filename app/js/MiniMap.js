// MiniMap.js
(function (Canopy) {

  // MiniMap style.
  var STYLE = {
    height: 64,
    infoAreaHeight: 16,
    miniMapHeight: 48,
    color: '#4CAF50',
    colorBackground: '#ECEFF1',
    regionColor: 'rgba(255, 192, 192, 0.5)',
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

    // Global style.
    this.ctx.font = STYLE.infoFont;

    // App controller.
    this.controller = controller;

    this.renderedBuffer = null;
    this.needsRedraw = false;

    // Start/end points on audio sample.
    this.sampleStart = null;
    this.sampleEnd = null;
    this.pixelPerSample = null;
    this.isRegionValid = false;

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

    // var pixelPerSample = this.width / this.renderedBuffer.length;
    var y_origin = STYLE.miniMapHeight * 0.5;
    var y_length;
    var x = 0, px = 0;

    // Styles.
    this.ctx.strokeStyle = STYLE.color;

    // Draw center line.
    this.ctx.beginPath();
    this.ctx.lineWidth = 0.5;
    this.ctx.moveTo(0, y_origin);
    this.ctx.lineTo(this.width, y_origin);
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
      x += this.pixelPerSample;
    }
    this.ctx.stroke();
  };

  MiniMap.prototype.drawOverlay = function () {
    this.ctx.lineWidth = 1.0;
    this.ctx.strokeStyle = STYLE.infoColor;
    this.ctx.textAlign = 'center';

    // Convert sample to pixel.
    var start = this.sampleStart * this.pixelPerSample;
    var end = this.sampleEnd * this.pixelPerSample;
    var sampleLength = this.sampleEnd - this.sampleStart;

    // Check the visual region's validity.
    if (start <= 0 && end >= this.width - 1) {
      this.isRegionValid = false;
      return;
    }
    
    this.isRegionValid = true;

    this.ctx.fillStyle = STYLE.regionColor;
    this.ctx.fillRect(start, 0, end - start, STYLE.miniMapHeight);

    this.ctx.fillStyle = STYLE.infoColor;
    this.ctx.fillRect(start, 0, 1, STYLE.miniMapHeight);
    this.ctx.fillRect(end - 1, 0, 1, STYLE.miniMapHeight);
    this.ctx.fillText(sampleLength, start + (end - start) * 0.5, STYLE.miniMapHeight * 0.8);

    // Draw additional info above 150 pixel-width.
    if (end - start > 50) {
      this.ctx.fillText(this.sampleStart, start, STYLE.miniMapHeight * 1.2);
      this.ctx.fillText(this.sampleEnd, end, STYLE.miniMapHeight * 1.2);
    }

    this.ctx.beginPath();
    // 0.51 is the magic number to draw a clear (non-blurred) line.
    this.ctx.moveTo(start, STYLE.miniMapHeight * 0.51);
    this.ctx.lineTo(end, STYLE.miniMapHeight * 0.51);
    this.ctx.stroke();
  };

  // Render loop in 60fps.
  MiniMap.prototype.render = function () {
    if (this.needsRedraw) {
      this.clearCanvas();
      this.drawMiniMap();
      this.drawOverlay();
      this.needsRedraw = false;
    }
    requestAnimationFrame(this.render.bind(this));
  };

  MiniMap.prototype.updateViewPort = function () {
    if (!this.renderedBuffer)
      return;
    
    // Change the PPS factor on resize, or buffer change.
    this.pixelPerSample = this.width / this.renderedBuffer.length;
    this.needsRedraw = true;
  };

  MiniMap.prototype.setBuffer = function (buffer) {
    this.renderedBuffer = buffer;
    this.sampleStart = 0;
    this.sampleEnd = this.renderedBuffer.length;

    // By default, the region is invalid. (start === end)
    this.isRegionValid = false;
    
    this.updateViewPort();
  };


  // minimap -> controller
  MiniMap.prototype.setRegionRange = function (regionStart, regionEnd) {
    
    // New start/end positions in samples.
    var start = Math.round(regionStart / this.pixelPerSample);
    var end = Math.round(regionEnd / this.pixelPerSample);

    // Validate the start/end positions. (should be greater than 512 samples)
    if (Math.abs(end - start) < Canopy.MIN_SAMPLES_IN_VIEWPORT)
      return;

    // Swap them if necessary.
    if (start > end) {
      this.sampleStart = end;
      this.sampleEnd = start;
    } else {
      this.sampleStart = start;
      this.sampleEnd = end;
    }

    var length = this.sampleEnd - this.sampleStart;

    // If the region is being dragged to the left end, clip the
    // delta x.
    if (this.sampleStart < 0) {
      this.sampleStart = 0;
      this.sampleEnd = this.sampleStart + length;
    }

    // If the region is being dragged over the right end, clip the
    // delta x.
    if (this.sampleEnd > this.renderedBuffer.length - 1) {
      this.sampleEnd = this.renderedBuffer.length - 1;
      this.sampleStart = this.sampleEnd - length;
    }

    this.onChange('viewport-change', {
      start: this.sampleStart,
      end: this.sampleEnd
    });

    this.needsRedraw = true;
  };

  // controller -> minimap
  MiniMap.prototype.setSampleRange = function (sampleStart, sampleEnd) {
    this.sampleStart = sampleStart;
    this.sampleEnd = sampleEnd;
    this.needsRedraw = true;
  };

  MiniMap.prototype.onChange = function (eventType, data) {
    this.controller.notify('minimap', eventType, data);
  };

  // TO FIX: resizing should change the regionStart/End properly.
  MiniMap.prototype.onResize = function () {
    this.canvas.width = this.width = window.innerWidth - 520;
    this.canvas.height = STYLE.height;
    this.updateViewPort();
  };

  MiniMap.prototype.registerMouseHandler = function () {

    // UI mode: { MOVE, CREATE }
    var mode = 'MOVING';

    // 3x: origin, previous, delta.
    var ox, px, dx;

    var mouseHandler = new MouseResponder('MiniMap', this.canvas,
      function (sender, action, data) {
        // console.log(action, data);
        var start = this.sampleStart * this.pixelPerSample;
        var end = this.sampleEnd * this.pixelPerSample;

        switch (action) {

          case 'clicked':
            
            px = data.x;
            dx = 0;
            
            // Define behavior. Move only when the region is valid.
            if (start <= data.x && data.x <= end && this.isRegionValid) {
              mode = 'MOVE';
            } else {
              mode = 'CREATE';
              ox = data.x;
              this.setRegionRange(data.x, data.x + 1);
            }
            break;

          case 'dragged':
            dx = px - data.x;
            switch (mode) {
              case 'MOVE':
                this.setRegionRange(start - dx, end - dx);
                break;
              case 'CREATE':
                this.setRegionRange(ox, data.x);
                break;
            }
            px = data.x;
            break;
        }
      }.bind(this)
    );

  };


  // MiniMap factory.
  Canopy.createMiniMap = function (canvasId) {
    return new MiniMap(canvasId, Canopy);
  };

})(Canopy);


