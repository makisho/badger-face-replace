var cv = require('opencv');

var makeCamera = (camWidth, camHeight) => {
  var camera = new cv.VideoCapture(0);
  camera.setWidth(camWidth);
  camera.setHeight(camHeight);
  return camera;
};

var makeMasks = (maskImg, camWidth, maskSizeRatio) => {
  var masks = [];
  for (var i = 10; i < camWidth; i+= 10) {
    var resized = maskImg.clone();
    resized.resize(i, i * maskSizeRatio);
    masks.push(resized);
  }
  return masks;
}

module.exports = {
  makeCamera,
  makeMasks
};
