(function (SpiralSpectra) {

  var STYLE = {
    width: 480,
    height: 128,
    color: '#4FC3F7',
    colorBackground: '#ECEFF1',
    colorCenterLine: '#37474F',
    colorInfo: '#FFF',
    colorBorder: '#FFF',
    fontInfo: '11px Arial',
  };

  // Default FFT size.
  var FFT_SIZE = 512;

  // Smoothing constant between successive FFT frame.
  var SMOOTHING_CONSTANT = 0;

  /**
   * @class Spectra
   */
  function Spectra(ctx, x, y, width, height) {
    this.initialize(ctx, x, y, width, height);
  }


  /** Internal methods */

  Spectra.prototype.initialize = function(ctx, x, y, width, height) {

    this.ctx = ctx;
    this.canvasOS = document.createElement('canvas');
    this.ctxOS = this.canvasOS.getContext('2d');

    this.width = (width || STYLE.width);
    this.height = (height || STYLE.height);

    // FFT configuration.
    this.fftSize = FFT_SIZE;
    this.halfBin = this.fftSize / 2;  // The bin index of nyquist freq.
    this.hopSize = this.fftSize / 2;  // Hop interval between window.
    this.numHops = 0;

    // FFT object instance.
    this.FFT = new FFT(Math.log2(this.fftSize));
    this.reals = new Float32Array(this.fftSize);
    this.imags = new Float32Array(this.fftSize);
    this.temp = new Float32Array(this.fftSize);
    this.mags = new Float32Array(this.halfBin);
    this.window = generateBlackmanWindow(this.fftSize);

    this.regionStart = 0.0;
    this.regionEnd = 1.0;
    this.totalDuration = 1.0;
    this.useLogarithmicScale = true;

    this.isSpectrogramRendered = false;
    this.data = null;
    this.sampleRate = null;
  };

  Spectra.prototype.setSize = function (width, height) {
    this.width = (width || STYLE.width);
    this.height = (height || STYLE.height);
    this.draw();
  };

  Spectra.prototype.renderSpectrogram = function () {

    this.numHops = Math.floor(this.data.length / this.hopSize);

    // The number of fft iteration and drop beyond the nyquist for drawing.
    this.canvasOS.width = this.numHops;
    this.canvasOS.height = this.halfBin;
    var canvasData = this.ctxOS.getImageData(0, 0, this.numHops, this.halfBin);

    // Magnitude scaler.
    var magScale = 1.0 / this.fftSize;

    for (var hop = 0; hop < this.numHops; hop++) {
      // Get a frame from the channel data. Note that fftFrame is a subarray and
      // can't be modified.
      var fftFrame = this.data.subarray(hop * this.hopSize, hop * this.hopSize + this.fftSize);

      // Apply window.
      for (var i = 0; i < fftFrame.length; i++)
        this.temp[i] = this.window[i] * fftFrame[i];

      // Execute RFFT and fill |.reals| and |.iamgs| with the result.
      this.FFT.rfft(this.temp, this.reals, this.imags);

      // Draw the magnitude in frequency bins below Nyquist.
      for (var bin = 0; bin < this.halfBin; bin++) {

        // Get absolute value from real and imag numbers.
        var mag = Math.sqrt(this.reals[bin] * this.reals[bin] + this.imags[bin] * this.imags[bin]);

        // Scale and convert to dB.
        mag = 20 * Math.log(magScale * mag + 1);

        // Smoothing over time.
        this.mags[bin] = this.mags[bin] * SMOOTHING_CONSTANT + mag * (1.0 - SMOOTHING_CONSTANT);
        
        // Plotting the data into the raw pixels: linear scale.
        this._plotPixels(canvasData, this.mags[bin], hop, bin);
      }
    }

    // Update OS canvas.
    this.ctxOS.putImageData(canvasData, 0, 0);

    this.isSpectrogramRendered = true;

    this.draw();
  };

  Spectra.prototype._plotPixels = function (canvasData, value, hop, bin) {
    var grayscale = ~~(value * 255);
    var index = (hop + bin * this.numHops) * 4;
    canvasData.data[index + 0] = grayscale;
    canvasData.data[index + 1] = grayscale;
    canvasData.data[index + 2] = grayscale;
    canvasData.data[index + 3] = 255;
  };

  Spectra.prototype.handleInvalidAudioBuffer = function () {
    this.ctx.textAlign = 'center';
    this.ctx.font = STYLE.fontInfo;
    this.ctx.fillText('Nothing to display.', this.width * 0.5, this.yCenter + 5);
  };

  Spectra.prototype.drawOverlay = function() {
    // Draw opaque rectangles.
    // var regionStartPixel = (this.regionStart * this.sampleRate / this.data.length) * this.width;
    // var regionEndPixel = (this.regionEnd * this.sampleRate / this.data.length) * this.width;

    // this.ctx.fillStyle = STYLE.colorOverlayRect;
    // this.ctx.fillRect(0, 0, regionStartPixel, this.height);
    // this.ctx.fillRect(regionEndPixel, 0, this.width - regionEndPixel, this.height);

    // // Draw handles. (boxes)
    // this.ctx.fillStyle = STYLE.colorHandle;
    // this.ctx.fillRect(regionStartPixel, this.yCenter, regionEndPixel - regionStartPixel, 1);
    // this.ctx.fillRect(regionStartPixel, 0, 2, this.height);
    // this.ctx.fillRect(regionStartPixel - 40, this.yCenter - 10, 40, 20);
    // this.ctx.fillRect(regionEndPixel - 2, 0, 2, this.height);
    // this.ctx.fillRect(regionEndPixel, this.yCenter - 10, 40, 20);

    // // Draw texts.
    // // TODO: fixed all the hard-coded numbers.
    // this.ctx.font = STYLE.fontInfo;
    // this.ctx.textAlign = 'center';
    // this.ctx.fillStyle = STYLE.colorInfo;
    // this.ctx.fillText(this.regionStart.toFixed(3), regionStartPixel - 20, this.yCenter + 4);
    // this.ctx.fillText(this.regionEnd.toFixed(3), regionEndPixel + 20, this.yCenter + 4);

    // var regionWidth = regionEndPixel - regionStartPixel;
    // if (regionWidth > 40) {
    //   this.ctx.fillStyle = STYLE.colorHandle;
    //   this.ctx.fillText((this.regionEnd - this.regionStart).toFixed(3),
    //     regionStartPixel + regionWidth * 0.5, this.yCenter + 15);
    // }
  };

  Spectra.prototype.drawInfo = function() {
    // TODO:
  };


  /** Public methods */

  Spectra.prototype.setAudioBuffer = function (audioBuffer) {
    // Sum audio buffer into mono channel data.
    var numChannels = audioBuffer.numberOfChannels;
    this.data = new Float32Array(audioBuffer.length);
    for (var i = 0; i < numChannels; i++) {
      var channelData = audioBuffer.getChannelData(i);
      for (var j = 0; j < channelData.length; j++) {
        this.data[j] += channelData[j] / numChannels;
      }
    }

    // Initialize start, end and sampleRate.
    this.regionStart = 0.0;
    this.regionEnd = this.totalDuration = audioBuffer.duration;
    this.sampleRate = audioBuffer.sampleRate;
    this.isSpectrogramRendered = false;

    this.renderSpectrogram();
  };

  Spectra.prototype.draw = function () {
    if (!this.data) {
      this.handleInvalidAudioBuffer();
      return;
    }

    // Flipped the y-axis for the on-screen drawing.
    // Note: (Hscale, Hskew, Vscale, Vskew, Htrans, Vtrans)
    this.ctx.setTransform(1, 0, 0, -1, 0, this.height);

    // Clear screen.
    this.ctx.fillStyle = STYLE.colorBackground;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Copy it back to the on-screen canvas.
    if (this.isSpectrogramRendered) {
      var startHop = Math.floor(this.numHops * this.regionStart / this.totalDuration);
      var endHop = Math.floor(this.numHops * this.regionEnd / this.totalDuration);

      if (this.useLogarithmicScale) {
        var maxBinIndex = this.halfBin - 1;
        var logmax = Math.log(maxBinIndex, 2); 
        var prevY = 0;

        // Scan top-down (0 -> halfBin - 1) and transform y-coord to the log scale.
        for (var y = 1; y <= maxBinIndex; y++) {
          var logy = Math.floor(this.height * Math.log(y, 2) / logmax);
          this.ctx.drawImage(this.ctxOS.canvas,
            startHop, y - 1, endHop - startHop, 1,
            0, prevY, this.width, logy - prevY);
          prevY += logy - prevY;
        }
      } else {
        this.ctx.drawImage(this.ctxOS.canvas, 
          startHop, 0, endHop - startHop, this.halfBin,
          0, 0, this.width, this.height);
      }
    }

    // Clear residues.
    this.ctx.strokeStyle = STYLE.colorBorder;
    this.ctx.strokeRect(0, 0, this.width, this.height);

    // this.drawOverlay();
    // this.drawInfo();
  };

  Spectra.prototype.setRegion = function (start, end) {
    if (!this.data)
      return;

    // TODO: check the reversed case. check both boundaries.
    this.regionStart = Math.max(0, start);
    this.regionEnd = Math.min(this.data.length / this.sampleRate, end);
  };

  Spectra.prototype.getRegion = function () {
    return {
      start: this.regionStart,
      end: this.regionEnd
    };
  };

  Spectra.prototype.setScale = function (mode) {
    switch (mode) {
      case 'linear':
        this.useLogarithmicScale = false;
        break;
      case 'log':
        this.useLogarithmicScale = true;
        break;
    }
  }

  // Factory.
  SpiralSpectra.create = function (ctx, x, y, width, height) {
    return new Spectra(ctx, x, y, width, height);
  };

})(SpiralSpectra = {});