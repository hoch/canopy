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
    font: '',
    fontSize: ''
  };


  /**
   * @class MiniMap
   *
   * MiniMap has control over |waveformRenderer|. User interaction on the
   * minimap will cause the visual update on the waveform renderer(viewport
   * change).
   */
  function MiniMap(canvasId, waveformRenderer) {

    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');

    this.waveformRenderer = waveformRenderer;
    
    this.renderedBuffer = null;
    this.needsRedraw = false;

    // Registering Mouse handler.
    this.regionStart = null;
    this.regionEnd = null;
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
    var x = 0, px = 0, y_offset, y_length;

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
    var maxSample = 0;
    // TO FIX: use both channel.
    var chanL = this.renderedBuffer.getChannelData(0);
    for (var i = 0; i < chanL.length; i++) {
      // Find the max sample.
      var sample = Math.abs(chanL[i]);
      if (maxSample < sample)
        maxSample = sample;
      // Drop sub-pixel elements for rendering.
      if (x - px >= 1) {
        x = Math.round(x);
        y_length = maxSample * STYLE.miniMapHeight;
        y_offset = (STYLE.miniMapHeight - y_length) * 0.5;
        this.ctx.moveTo(x, y_offset);
        this.ctx.lineTo(x, y_offset + y_length);
        px = x;
        maxSample = 0;
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
    this.ctx.font = '10px Arial';
    this.ctx.textAlign = 'center';
    
    this.ctx.beginPath();
    this.ctx.fillRect(this.regionStart, STYLE.miniMapHeight + STYLE.infoAreaHeight * 0.1, 1, STYLE.infoAreaHeight * 0.3);
    this.ctx.moveTo(this.regionStart, STYLE.miniMapHeight + STYLE.infoAreaHeight * 0.4);
    this.ctx.lineTo(this.regionEnd, STYLE.miniMapHeight + STYLE.infoAreaHeight * 0.4);
    this.ctx.fillRect(this.regionEnd, STYLE.miniMapHeight + STYLE.infoAreaHeight * 0.1, 1, STYLE.infoAreaHeight * 0.3);

    // TO FIX: this info should come from audio engine (sample or time)
    this.ctx.fillText(this.regionEnd - this.regionStart, this.regionStart + (this.regionEnd - this.regionStart) * 0.5, STYLE.miniMapHeight + STYLE.infoAreaHeight);
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

  // On user interaction.
  MiniMap.prototype.onChange = function () {
    // Command change to renderer.
    if (this.waveformRenderer)
      this.waveformRenderer.setViewPort(this.regionStart, this.regionStart);

    this.needsRedraw = true;
  };

  // On resize.
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
                if (this.regionEnd - dx > this.width - 1) {
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
                  this.regionStart = data.x;
                  this.regionEnd = ox;
                } else {
                  this.regionStart = ox;
                  this.regionEnd = data.x;
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
    return new MiniMap(canvasId);
  };

})(Canopy);


