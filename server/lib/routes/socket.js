var camera = require('../src/camera');

module.exports = function (socket) {
  var camFps = 5;
  var camInterval = 1000 / camFps;

  camera.start();

  var counter = 0;
  var detectedFaces = [];

  setInterval(function() {
    camera.getImage(counter, detectedFaces).then(result => {
      counter = result.counter;
      detectedFaces = result.detectedFaces;
      socket.emit('frame', { buffer: result.image.toBuffer() });
    }).catch(err => {
      console.log("Error:", err);
    });
  }, camInterval);
};
