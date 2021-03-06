var camera = require('../src/camera');
var twitter = require('../src/twitter');

var { FPS, GIF_LENGTH } = require('../config/camera');

var imageQueue = [];

function addToQueue(item) {
  if (imageQueue.length >= FPS * GIF_LENGTH) imageQueue.shift();
  imageQueue.push(item);
}

function runCamera(socket) {
  camera.start();
  return camera.run((image) => {
    addToQueue(image);
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
      if (imageQueue.length > 0) camera.saveImage(imageQueue[4], (imgPath) => {
        socket.emit('showImage', { imgPath });
      });
    } else {
      console.log("Error: camera is not running");
    }
  });

  socket.on('takeVideo', () => {
    if (processID) {
      setTimeout(() => {
        clearInterval(processID);
        camera.stop();
        if (imageQueue.length > 0) {
          socket.emit('isLoading');

          var gifQueue = [];
          imageQueue.map((frame, i) => {
            if (i % 2 === 1) gifQueue.push(frame);
          });

          camera.saveGIF(gifQueue, (imgPath) => {
            socket.emit('showImage', { imgPath });
          });
        }
      }, GIF_LENGTH * 1000);
    } else {
      console.log("Error: camera is not running");
    }
  });

  function validateTwitterInput(input) {
    console.log(input.split(' '));
    var valid = true;
    input.split(' ').map(words => {
      if (words[0] !== '@') valid = false;
    });
    return valid;
  }

  socket.on('tweet', (data) => {
    if (data.handles && validateTwitterInput(data.handles)) {
      twitter.postImage(data.handles, data.imagePath, () => {
        socket.emit('tweetSent');
      });
    } else {
      socket.emit('twitterError');
    }
  });
};
