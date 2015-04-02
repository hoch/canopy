// Specgram module.
(function (Canopy) {

  // Specgram style.
  var STYLE = {
    height: 256,
    color: '#4CAF50',
    colorBackground: '#ECEFF1'
  };

  // Default FFT size.
  var FFT_SIZE = 1024;

  // Smoothing constant between successive FFT frame.
  var SMOOTHING_CONSTANT = 0.25;

  // Blackman window generator.
  function generateBlackmanWindow(length) {
    var alpha = 0.16;
    var a0 = 0.5 * (1 - alpha);
    var a1 = 0.5;
    var a2 = 0.5 * alpha;
    var twoPI = Math.PI * 2.0;
    var blackman = new Float32Array(length);
    for (var i = 0; i < length; i++) {
      var x = i / length;
      blackman[i] = a0 - a1 * Math.cos(twoPI * x) + a2 * Math.cos(twoPI * 2 * x);
    }
    return blackman;
  }


  /**
   * @class Specgram
   *
   * Specgram implementation. Uses rtoy's FFT class.
   */
  function Specgram(canvasId, controller) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');

    // App controller.
    this.controller = controller;

    this.renderedBuffer = null;

    // FFT configuration.
    this.fftSize = FFT_SIZE;
    this.halfBin = this.fftSize >> 1; // nyquist bin.
    this.hopSize = this.fftSize >> 1; // half of FFT size.
    this.numHops = null;

    // FFT object instance.
    this.FFT = new FFT(Math.log2(FFT_SIZE));
    this.reals = new Float32Array(FFT_SIZE);
    this.imags = new Float32Array(FFT_SIZE);
    this.temp = new Float32Array(FFT_SIZE);
    this.mags = new Float32Array(this.halfBin);
    this.window = generateBlackmanWindow(FFT_SIZE);

    this.sampleStart = null;
    this.sampleEnd = null;
    this.pixelPerSample = null;
  }

  Specgram.prototype.clearCanvas = function () {
    this.ctx.fillStyle = STYLE.colorBackground;
    this.ctx.fillRect(0, 0, this.width, STYLE.height);
  };

  Specgram.prototype.drawSpecgram = function () {
    if (!this.renderedBuffer)
      return;

    this.numHops = Math.floor(this.renderedBuffer.length / this.hopSize);
    var unitX = this.width / this.numHops;
    var unitY = STYLE.height / this.halfBin;

    // Magnitude scaler.
    var magScale = 1.0 / this.fftSize; 

    var chanL = this.renderedBuffer.getChannelData(0);

    for (var h = 0; h < this.numHops; h++) {
      // Get a frame from the rendered buffer. Note that fftFrame can't be 
      // modified.
      var fftFrame = chanL.subarray(h * this.hopSize, h * this.hopSize + this.fftSize);

      // Apply blackman window.
      for (var b = 0; b < fftFrame.length; b++)
        this.temp[b] = this.window[b] * fftFrame[b];

      // Execute RFFT and pass the result to |.reals| and |.iamgs| arrays.
      this.FFT.rfft(this.temp, this.reals, this.imags);

      // Draw the magnitude in frequency bins below Nyquist.
      for (b = 0; b < this.halfBin; b++) {
        
        // Get absolute value from real and imag numbers.
        var mag = Math.sqrt(this.reals[b] * this.reals[b] + this.imags[b] * this.imags[b]);
        
        // Scale and convert to dB.
        mag = 20 * Math.log(magScale * mag + 1);
        
        // Smoothing over time.
        this.mags[b] = this.mags[b] * SMOOTHING_CONSTANT + mag * (1.0 - SMOOTHING_CONSTANT);

        // Draw the bin based on HSL color model.
        this.ctx.fillStyle = 'hsl(' + this.mags[b] * 360 + ', 100%, ' + this.mags[b] * 75 + '%)';
        this.ctx.fillRect(h * unitX, STYLE.height - b * unitY, unitX, unitY);
      }
    }
  };

  Specgram.prototype.updateViewPort = function () {
    if (!this.renderedBuffer)
      return;

    this.clearCanvas();
    this.drawSpecgram();
  };

  Specgram.prototype.setBuffer = function (buffer) {
    this.renderedBuffer = buffer;
    this.updateViewPort();
  };

  Specgram.prototype.onResize = function () {
    this.canvas.width = this.width = window.innerWidth - 520;
    this.canvas.height = STYLE.height;
    this.updateViewPort();
  };


  // MiniMap factory.
  Canopy.createSpecgram = function (canvasId) {
    return new Specgram(canvasId, Canopy);
  };

})(Canopy);