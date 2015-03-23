// Canopy View module
(function (Canopy) {

  Canopy.View = {};

  var ctx = Canopy.waveformDOM.getContext('2d');
  var ctxMiniMap = Canopy.minimapDOM.getContext('2d');

  var width;
  var height = 384;
  var rulerHeight = 30;
  var minimapHeight = 48;

  // Local variables
  var zoomLevel = -1;
  var zoomFactor = 0.5; // = 2 ^ zoomLevel
  var sampleOffset = 0;
  var renderedBuffer = null;

  var clearColor = '#ECEFF1';
  var rulerColor = '#37474F';
  var rulerGridColor = '#CFD8DC';
  var rulerGridLineWidth = 1.0;
  var rulerFont = '9px Arial';
  var waveformColor = '#03A9F4';
  var waveformCenterLineColor = '#B0BEC5';
  var waveformLineWidth = 1.0;
  var cursorColor = 'E91E63';

  var miniMapBGColor = '#CFD8DC';
  var miniMapColor = '#37474F';

  var needsRedraw = false;

  // in Samples.
  var viewStart = 0;
  var viewEnd = 0;
  // var viewLength = 128;
  var viewAnchor = 64;

  var bufferLength = 0;
  var pixelsPerSample = 0;
  var grids = [5000, 2500, 500, 250, 100, 50, 25]; // samples
  var gridLevel = 0;
  var gridSize; // sample

  /** Mouse Handlers **/
  var prevX = 0, dX = 0;
  var prevY = 0, dY = 0;
  var currentX = 0;


  function clearView() {
    ctx.fillStyle = clearColor;
    ctx.fillRect(0, 0, width, height);
  }

  function drawRuler() {
    var nextGrid = viewStart + gridSize - (viewStart % gridSize);
    var x = 0;

    ctx.fillStyle = rulerColor;
    ctx.strokeStyle = rulerGridColor;
    ctx.lineWidth = rulerGridLineWidth;
    
    ctx.fillRect(0, 0, width, rulerHeight);
    
    ctx.beginPath();
    ctx.fillStyle = rulerGridColor;
    ctx.font = rulerFont;

    for (var i = viewStart; i < viewEnd; i++) {
      // Draw a grid when the buffer index passes the grid position.
      if (i >= nextGrid) {
        ctx.fillText(nextGrid, x, 15);
        ctx.moveTo(x, 20);
        ctx.lineTo(x, 28.5);
        nextGrid += gridSize;
      }
      x += pixelsPerSample;
    }
    ctx.stroke();
  }

  function drawWaveform() {

    if (!renderedBuffer) {
      // console.log('Canopy(!) Invalid audio buffer. Cannot be rendered.'); 
      return;
    }

    var waveformHeight = height - rulerHeight - 1;
    var x = 0, px = 0, y_offset;

    ctx.save();
    ctx.translate(0, rulerHeight + 1);

    // Draw center line.
    ctx.beginPath();
    ctx.strokeStyle = waveformCenterLineColor;
    ctx.moveTo(0, waveformHeight * 0.5);
    ctx.lineTo(width, waveformHeight * 0.5);
    ctx.stroke();

    // Draw waveform.
    // TO FIX: get rid of aliasing.
    ctx.beginPath();
    ctx.strokeStyle = ctx.fillStyle = waveformColor;
    ctx.lineWidth = waveformLineWidth;
    for (var i = viewStart; i < viewEnd; i++) {
      // Draw only when the advance is bigger than one pixel.
      if (x - px >= 1) {
        y_offset = -renderedBuffer[i] * 0.5 + 0.5;
        y_offset *= waveformHeight;
        ctx.lineTo(x, y_offset);
        // Draw sample dots beyond 2x zoom.
        if (pixelsPerSample > 2)
          ctx.fillRect(x - 1.5, y_offset - 1.5, 3, 3);
        px = x;
      }
      x += pixelsPerSample;
    }
    ctx.stroke();

    // Draw the current cursor position.
    // ctx.beginPath();
    // ctx.strokeStyle = ctx.fillStyle = cursorColor;
    // ctx.moveTo(currentX, 0);
    // ctx.lineTo(currentX, height);
    // ctx.stroke();
    
    ctx.restore();
  }

  function drawMiniMap() {
    if (!renderedBuffer) {
      // console.log('Canopy(!) Invalid audio buffer. Cannot be rendered.'); 
      return;
    }

    // Use entire canvas width.
    var pps = width / renderedBuffer.length;
    var x = 0, px = 0, y_offset, y_length;

    // Clear canvas.
    ctxMiniMap.fillStyle = miniMapBGColor;
    ctxMiniMap.fillRect(0, 0, width, height);

    // Draw center line.
    ctxMiniMap.beginPath();
    ctxMiniMap.strokeStyle = miniMapColor;
    ctxMiniMap.moveTo(0, minimapHeight * 0.5);
    ctxMiniMap.lineTo(width, minimapHeight * 0.5);
    ctxMiniMap.stroke();

    // Draw waveform.
    ctxMiniMap.beginPath();
    ctxMiniMap.strokeStyle = ctxMiniMap.fillStyle = miniMapColor;
    var maxSample = 0;
    for (var i = 0; i < renderedBuffer.length; i++) {
      // Find the max sample.
      var sample = Math.abs(renderedBuffer[i]);
      if (maxSample < sample)
        maxSample = sample;
      // Drop sub-pixel elements for rendering.
      if (x - px >= 1) {
        x = Math.round(x);
        y_length = maxSample * minimapHeight;
        y_offset = (minimapHeight - y_length) * 0.5;
        ctxMiniMap.moveTo(x, y_offset);
        ctxMiniMap.lineTo(x, y_offset + y_length);
        px = x;
        maxSample = 0;
      }
      x += pps;
    }
    ctxMiniMap.stroke();
  }

  // Render!
  function render() {
    if (needsRedraw) {
      clearView();
      drawWaveform();
      drawRuler();
      // drawMinimap();
      // updateStat();
      needsRedraw = false;
    }
    requestAnimationFrame(render);  
  }

  function updateViewport() {
    pixelsPerSample = width / (viewEnd - viewStart);
    gridLevel = ~~(20 * Math.log10(pixelsPerSample + 1));
    gridLevel = gridLevel > 6 ? 6 : gridLevel;
    gridSize = grids[gridLevel];
    drawMiniMap();
    needsRedraw = true;
  }

  Canopy.View.setBuffer = function (buffer) {
    renderedBuffer = buffer.getChannelData(0);
    viewStart = 0;
    viewEnd = bufferLength = renderedBuffer.length;
    // TODO: draw minimap offscreen.
    updateViewport();
    Canopy.ViewSpecgram.drawSpecgram(renderedBuffer);
  };

  Canopy.View.zoom = function (deltaY, x) {
    var deltaFactor = deltaY / pixelsPerSample / width;
    viewStart -= ~~(deltaFactor * x);
    viewEnd += ~~(deltaFactor * (width - x));
    viewStart = Math.max(viewStart, 0);
    viewEnd = Math.min(viewEnd, bufferLength);
    updateViewport();
  };

  Canopy.View.pan = function (deltaX) {
    // TOFIX: remove aliasing!!
    var delta = ~~(deltaX / pixelsPerSample);
    if (viewStart + delta < 0 || viewEnd + delta > bufferLength)
      return;
    viewStart += delta;
    viewEnd += delta;
    updateViewport();
  };

  Canopy.View.onResize = function () {
    width = window.innerWidth - Canopy.config.editorWidth;
    ctx.canvas.width = width;
    ctx.canvas.height = height;
    ctxMiniMap.canvas.width = width;
    ctxMiniMap.canvas.height = minimapHeight;
    // if (width < 600) {
    //   alert('Please resize the window for the better visualization.');
    // }
    updateViewport();
  };

  
  var mouseHandler = new MouseResponder('waveform', Canopy.waveformDOM, 
    function (sender, action, data) {
      // console.log(action, data);
      switch (action) {
        case 'clicked':
          prevX = data.x;
          prevY = data.y;
          dX = 0;
          dY = 0;
          break;
        case 'dragged':
          dX = prevX - data.x;
          dY = prevY - data.y;
          // TOFIX: latch: X or Y?
          if (dX * dX >= dY * dY) {
            Canopy.View.pan(dX); 
          } else {
            Canopy.View.zoom(dY * 10, data.x);
          }          
          prevX = data.x;
          prevY = data.y;
          break;
      }
    }
  );

  // Boot up the gfx engine.
  render();

})(Canopy);