var cv = require('opencv');

var ALGORITHM_PATH = './node_modules/opencv/data/haarcascade_frontalface_alt_tree.xml';

var RESIZE_FACTOR;

var makeCamera = (camWidth, camHeight, resizeFactor) => {
  var camera = new cv.VideoCapture(0);
  camera.setWidth(camWidth);
  camera.setHeight(camHeight);
  RESIZE_FACTOR = resizeFactor;
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

function applyMask(mask, camHeight, camWidth, image, x, y) {
  if ((y + mask.height() < camHeight) && (x + mask.width() < camWidth)) {
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

var getImage = (camera, masks, camHeight, camWidth, counter, face_backup) => {
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
            applyMask(mask, camHeight, camWidth, image, face.x * RESIZE_FACTOR, face.y * RESIZE_FACTOR);
          }
        });

        resolve({image, counter, face_backup});
      });
    });
  });
}

module.exports = {
  makeCamera,
  makeMasks,
  getImage
};
