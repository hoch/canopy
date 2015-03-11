function MouseResponder(senderID, targetElement, MUICallback) {
  this.senderId = senderID;
  this.container = targetElement;
  this.callback = MUICallback;
  // bound function references
  this.ondragged = this.dragged.bind(this);
  this.onreleased = this.released.bind(this);
  // timestamp
  this._prevTS = 0;
  // init with onclick
  this.onclicked(targetElement);
  this.onwheel(targetElement);
}

MouseResponder.prototype = {

  getEventData: function (event) {
    var r = this.container.getBoundingClientRect();
    return {
      x: event.clientX - r.left,
      y: event.clientY - r.top,
      ctrlKey: event.ctrlKey,
      altKey: event.altKey,
      shiftKey: event.shiftKey,
      metaKey: event.metaKey
    };
  },

  onclicked: function (target) {
    target.addEventListener('mousedown', function (event) {
      event.preventDefault();
      this._prevTS = event.timeStamp;
      var p = this.getEventData(event);
      this.callback(this.senderId, 'clicked', p);
      window.addEventListener('mousemove', this.ondragged, false);
      window.addEventListener('mouseup', this.onreleased, false);
    }.bind(this), false);
  },

  dragged: function (event) {
    event.preventDefault();
    if (event.timeStamp - this._prevTS < 16.7)
      return;
    this._prevTS = event.timeStamp;
    var p = this.getEventData(event);
    this.callback(this.senderId, 'dragged', p);
  },

  released: function (event) {
    event.preventDefault();
    var p = this.getEventData(event);
    this.callback(this.senderId, 'released', p);
    window.removeEventListener('mousemove', this.ondragged, false);
    window.removeEventListener('mouseup', this.onreleased, false);
  },

  onwheel: function (target) {
    target.addEventListener('mousewheel', function (event) {
      event.preventDefault();
      this.callback(this.senderId, 'wheelmoved', {
        wheelDelta: event.wheelDelta
      });
    }.bind(this), false);
  }

};