var camera = require('../src/camera');

var CAM_FPS = 5;
var CAM_INTERVAL = 1000 / CAM_FPS;

var currentImage;

function runCamera(socket) {
  camera.start();

  var counter = 0;
  var detectedFaces = [];

  return setInterval(function() {
    camera.getImage(counter, detectedFaces).then(result => {
      counter = result.counter;
      detectedFaces = result.detectedFaces;
      currentImage = result.image;
      socket.emit('frame', { buffer: currentImage.toBuffer() });
    }).catch(err => {
      console.log("Error:", err);
    });
  }, CAM_INTERVAL);
}

module.exports = function (socket) {
  var processID;
  socket.on('startCamera', () => { processID = runCamera(socket); });
  socket.on('stopCamera', () => {
    if (processID) {
      clearInterval(processID);
      camera.stop();
      camera.saveImage(currentImage);
    } else {
      console.log("Error: camera is not running");
    }
  })
};
