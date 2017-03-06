var camera = require('../src/camera');

var CAM_FPS = 5;
var CAM_INTERVAL = 1000 / CAM_FPS;

function runCamera(socket) {
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
  }, CAM_INTERVAL);
}

module.exports = function (socket) {
  socket.on('startCamera', () => { runCamera(socket); });
};
