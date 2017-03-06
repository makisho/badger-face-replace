var cv = require('opencv');
var badgerCam = require('../src/camera');

// face detection properties
var resizeFactor = 4;

module.exports = function (socket) {
  var camFps = 5;
  var camInterval = 1000 / camFps;

  badgerCam.startCamera();

  var counter = 0;
  var detectedFaces = [];

  setInterval(function() {
    badgerCam.getImage(counter, detectedFaces).then(result => {
      counter = result.counter;
      detectedFaces = result.detectedFaces;
      socket.emit('frame', { buffer: result.image.toBuffer() });
    }).catch(err => {
      console.log("ERR:", err);
    });
  }, camInterval);
};
