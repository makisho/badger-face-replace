var cv = require('opencv');
var badgerCam = require('../src/camera');

// face detection properties
var resizeFactor = 4;

module.exports = function (socket) {
  var camFps = 5;
  var camInterval = 1000 / camFps;

  badgerCam.startCamera();

  var counter = 0;
  var face_backup;

  setInterval(function() {
    badgerCam.getImage(counter, face_backup).then(result => {
      counter = result.counter;
      face_backup = result.face_backup;
      socket.emit('frame', { buffer: result.image.toBuffer() });
    }).catch(err => {
      console.log("ERR:", err);
    });
  }, camInterval);
};
