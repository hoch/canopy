// Canopy View module
(function (Canopy) {

  Canopy.ViewSpecgram = {};

  var ctx = Canopy.spectrogramDOM.getContext('2d');

  var m_fftSize;
  var m_hopSize;
  var m_half;

  var m_fft;
  var m_reals, m_imags;
  var m_temp;
  var m_mags;
  var m_window;
  var m_smoothK = 0.8;

  var m_sampleBuffer;
  var m_viewStart, m_viewEnd;

  var m_width;
  var m_height = 192;
  var m_unitX, m_unitY;

  var m_READY = false;

  var m_clearColor = '#ECEFF1';


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

  function configure(fftSize) {
    m_fftSize = (fftSize || 1024);
    m_hopSize = m_fftSize / 2;
    m_half = m_fftSize / 2;

    // NOTE: Math.log2() is ES6.
    m_fft = new FFT(Math.log2(m_fftSize));
    m_reals = new Float32Array(m_fftSize);
    m_imags = new Float32Array(m_fftSize);
    m_temp = new Float32Array(m_fftSize);
    m_mags = new Float32Array(m_half);
    m_window = generateBlackmanWindow(m_fftSize);

    m_READY = true;
  }

  function clearView() {
    ctx.fillStyle = m_clearColor;
    ctx.fillRect(0, 0, m_width, m_height);
  }

  function drawSpecgram() {

    if (!m_sampleBuffer)
      return;

    var numHops = ~~((m_viewEnd - m_viewStart) / m_hopSize);
    var magScale = 1.0 / m_fftSize;

    m_unitX = m_width / numHops;
    m_unitY = m_height / m_half;

    // numHops = 10;
    for (var hop = 0; hop < numHops; hop++) {
      var frame = m_sampleBuffer.subarray(hop * m_hopSize, hop * m_hopSize + m_fftSize);

      // Apply window.
      for (var bin = 0; bin < frame.length; bin++)
        m_temp[bin] = m_window[bin] * frame[bin];

      m_fft.rfft(m_temp, m_reals, m_imags);
      m_imags[0] = 0;

      for (bin = 0; bin < m_half; bin++) {
        var mag = Math.sqrt(m_reals[bin] * m_reals[bin] + m_imags[bin] * m_imags[bin]) * magScale;
        mag = 20 * Math.log(mag + 1);
        m_mags[bin] = m_mags[bin] * m_smoothK + mag * (1.0 - m_smoothK);
        ctx.fillStyle = 'rgba(0, 0, 0, ' + m_mags[bin] + ')';
        ctx.fillRect(hop * m_unitX, m_height - bin * m_unitY, m_unitX, m_unitY);
      }
    }
  }


  Canopy.ViewSpecgram.configure = configure;

  Canopy.ViewSpecgram.drawSpecgram = function (samples, start, end) {
    if (!m_READY || !samples)
      return;

    m_sampleBuffer = samples;
    m_viewStart = (start || 0);
    m_viewEnd = (end || m_sampleBuffer.length);

    clearView();
    drawSpecgram();
  };

  Canopy.ViewSpecgram.onResize = function () {
    m_width = window.innerWidth - Canopy.config.editorWidth;
    ctx.canvas.width = m_width;
    ctx.canvas.height = m_height;
    clearView();
    drawSpecgram();
  };

  // Boot up the gfx engine.
  configure(1024);

})(Canopy);