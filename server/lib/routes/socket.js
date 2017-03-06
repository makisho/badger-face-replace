var cv = require('opencv');
var badgerCam = require('../src/camera');

// face detection properties
var resizeFactor = 4;

module.exports = function (socket) {
  var camWidth = 1280;
  var camHeight = 720;
  var camFps = 5;
  var camInterval = 1000 / camFps;

  var camera = badgerCam.makeCamera(camWidth, camHeight, resizeFactor);

  var maskImg;
  cv.readImage('lib/images/badger.jpg', (err, mat) => { maskImg = mat; });
  var maskSizeRatio = maskImg.height() / maskImg.width();

  var masks = badgerCam.makeMasks(maskImg, camWidth, maskSizeRatio);
  var counter = 0;
  var face_backup;

  setInterval(function() {
    badgerCam.getImage(camera, masks, camHeight, camWidth, counter, face_backup).then(result => {
      counter = result.counter;
      face_backup = result.face_backup;
      socket.emit('frame', { buffer: result.image.toBuffer() });
    }).catch(err => {
      console.log("ERR:", err);
    });
  }, camInterval);
};
