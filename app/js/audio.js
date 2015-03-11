// Canopy Audio (realtime) module
(function (Canopy) {

  Canopy.Audio = {};

  var m_context = new AudioContext();
  var m_masterGain = m_context.createGain();
  m_masterGain.connect(m_context.destination);

  var m_lastRenderedBuffer = null;
  
  Canopy.Audio.playRenderedBuffer = function (buffer) {
    m_lastRenderedBuffer = buffer;
    var source = m_context.createBufferSource();
    source.buffer = m_lastRenderedBuffer;
    source.connect(m_masterGain);
    source.start();
  };

})(Canopy);