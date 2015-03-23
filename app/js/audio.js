// Canopy Audio (realtime) module
(function (Canopy) {

  Canopy.Audio = {};

  var m_context = new AudioContext();
  var m_masterGain = m_context.createGain();
  m_masterGain.connect(m_context.destination);

  var m_lastRenderedBuffer = null;
  var m_loop = false;
  
  Canopy.Audio.setBuffer = function (buffer) {
    m_lastRenderedBuffer = buffer;
  };

  // Canopy.Audio.setLoop = function (loop) {
  //   m_loop = loop;
  // };

  Canopy.Audio.getRenderedBuffer = function () {
    // return the copied rendered buffer.
  };

  Canopy.Audio.play = function (buffer) {
    var source = m_context.createBufferSource();
    source.buffer = m_lastRenderedBuffer;
    source.connect(m_masterGain);
    source.start();
  };

})(Canopy);