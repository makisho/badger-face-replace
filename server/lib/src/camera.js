var cv = require('opencv');

var makeCamera = (camWidth, camHeight) => {
  var camera = new cv.VideoCapture(0);
  camera.setWidth(camWidth);
  camera.setHeight(camHeight);
  return camera;
};

module.exports = {
  makeCamera
};
