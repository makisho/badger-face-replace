var cv = require('opencv');

var ALGORITHM_PATH = './node_modules/opencv/data/haarcascade_frontalface_alt_tree.xml';

var camera;
var CAM_WIDTH = 1280;
var CAM_HEIGHT = 720;
var RESIZE_FACTOR = 5;

var setOpts = (camWidth, camHeight, resizeFactor) => {
  CAM_WIDTH = camWidth;
  CAM_HEIGHT = camHeight;
  RESIZE_FACTOR = resizeFactor;
};

var startCamera = () => {
  camera = new cv.VideoCapture(0);
  camera.setWidth(CAM_WIDTH);
  camera.setHeight(CAM_HEIGHT);
};

var makeMasks = (maskImg, maskSizeRatio) => {
  var masks = [];
  for (var i = 10; i < CAM_WIDTH; i+= 10) {
    var resized = maskImg.clone();
    resized.resize(i, i * maskSizeRatio);
    masks.push(resized);
  }
  return masks;
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

var getImage = (masks, counter, face_backup) => {
  return new Promise((resolve, reject) => {
    camera.read(function(err, image) {
      if (err) reject(err);

      image = image.flip(1);

      var newImage = image.copy();
      newImage.resize(image.width()/RESIZE_FACTOR, image.height()/RESIZE_FACTOR);

      newImage.detectObject(ALGORITHM_PATH, {}, function(err, faces) {
        if (err) throw err;

        counter++;
        if (counter >= 1) {
          face_backup = faces;
          counter = 0;
        }
        faces = face_backup || faces;

        faces.map(face => {
          if (face.height > 10) {
            var mask = getMask(face, masks);
            applyMask(mask, image, face.x * RESIZE_FACTOR, face.y * RESIZE_FACTOR);
          }
        });

        resolve({image, counter, face_backup});
      });
    });
  });
}

module.exports = {
  startCamera,
  makeMasks,
  getImage
};
