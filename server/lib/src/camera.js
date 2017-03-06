var cv = require('opencv');

var ALGORITHM_PATH = './node_modules/opencv/data/haarcascade_frontalface_alt_tree.xml';

var camera, maskImg, masks = [];
var CAM_WIDTH = 1280;
var CAM_HEIGHT = 720;
var RESIZE_FACTOR = 5;
var IS_RUNNING = false;

var setOpts = (camWidth, camHeight, resizeFactor) => {
  CAM_WIDTH = camWidth;
  CAM_HEIGHT = camHeight;
  RESIZE_FACTOR = resizeFactor;
};

var start = () => {
  camera = new cv.VideoCapture(0);
  camera.setWidth(CAM_WIDTH);
  camera.setHeight(CAM_HEIGHT);

  cv.readImage('lib/images/badger.jpg', (err, mat) => { maskImg = mat; });
  makeMasks(maskImg, maskImg.height() / maskImg.width());

  IS_RUNNING = true;
};

function makeMasks(maskImg, maskSizeRatio) {
  for (var i = 10; i < CAM_WIDTH; i+= 10) {
    var resized = maskImg.clone();
    resized.resize(i, i * maskSizeRatio);
    masks.push(resized);
  }
}

function applyMask(mask, image, x, y) {
  if ((y + mask.height() < CAM_HEIGHT) && (x + mask.width() < CAM_WIDTH)) {
    mask.copyTo(image, x, y);
    return true;
  }
  return false;
}

function getMask(face, masks) {
  var maskIndex = Math.floor(face.width * RESIZE_FACTOR / 10) - 1;
  if (maskIndex < 0) maskIndex = 0;
  return masks[maskIndex];
}

var getImage = (counter, detectedFaces) => {
  return new Promise((resolve, reject) => {
    if (!IS_RUNNING) reject("Please start the camera before attempting to get an image");

    camera.read(function(err, image) {
      if (err) reject(err);

      image = image.flip(1);

      var newImage = image.copy();
      newImage.resize(image.width()/RESIZE_FACTOR, image.height()/RESIZE_FACTOR);

      newImage.detectObject(ALGORITHM_PATH, {}, function(err, faces) {
        if (err) throw err;

        counter++;
        if (counter >= 1) {
          detectedFaces = faces;
          counter = 0;
        }

        faces = detectedFaces || faces;
        faces.map(face => {
          if (face.height > 10) {
            var mask = getMask(face, masks);
            applyMask(mask, image, face.x * RESIZE_FACTOR, face.y * RESIZE_FACTOR);
          }
        });

        resolve({image, counter, detectedFaces});
      });
    });
  });
}

module.exports = {
  start,
  setOpts,
  getImage
};
