var camera = require('../src/camera');
var twitter = require('../src/twitter');

var FPS = 5;
var imageQueue = [];

function addToQueue(item) {
  if (imageQueue.length >= 5) imageQueue.shift();
  imageQueue.push(item);
}

function runCamera(socket) {
  camera.start();
  return camera.run(FPS, (image) => {
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
          camera.saveGIF(imageQueue, (imgPath) => {
            socket.emit('showImage', { imgPath });
          });
        }
      }, 1000 / FPS * 5);
    } else {
      console.log("Error: camera is not running");
    }
  });

  socket.on('tweet', (data) => {
    twitter.postImage(data.user || '@redbadgerteam', data.imagePath, () => {
      socket.emit('tweetSent');
    });
  });
};
