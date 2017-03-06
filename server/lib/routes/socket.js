var camera = require('../src/camera');

var currentImage;

function runCamera(socket) {
  var fps = 5;
  camera.start();
  return camera.run(fps, (image) => {
    currentImage = image;
    socket.emit('frame', { buffer: image.toBuffer() });
  });
}

module.exports = function (socket) {
  var processID;
  socket.on('startCamera', () => { processID = runCamera(socket); });

  socket.on('takePicture', () => {
    if (processID) {
      clearInterval(processID);
      camera.stop();
      if (currentImage) camera.saveImage(currentImage);
    } else {
      console.log("Error: camera is not running");
    }
  });
};
