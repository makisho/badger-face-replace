var cv = require('opencv');
var path = require('path');
var gm = require('gm').subClass({ imageMagick: true });

var {
  CAM_WIDTH,
  CAM_HEIGHT,
  RESIZE_FACTOR,
  MASK_IMAGE,
  OUTPUT_IMAGE,
  ALGORITHM_PATH
} = require('../config/camera');

var camera, maskImg, masks = [];
var IS_RUNNING = false;

var start = () => {
  camera = new cv.VideoCapture(0);
  camera.setWidth(CAM_WIDTH);
  camera.setHeight(CAM_HEIGHT);

  cv.readImage(path.resolve(__dirname, '../images/', MASK_IMAGE), (err, mat) => { maskImg = mat; });
  makeMasks(maskImg, maskImg.height() / maskImg.width());

  IS_RUNNING = true;
};

var stop = () => {
  camera.release();
  IS_RUNNING = false;
};

var saveImage = (image) => {
  image.save(path.resolve(__dirname, '../output/', OUTPUT_IMAGE));
}

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

var run = (fps, callback) => {
  var counter = 0;
  var detectedFaces = [];
  return setInterval(() => {
    getImage(counter, detectedFaces).then(result => {
      counter = result.counter;
      detectedFaces = result.detectedFaces;
      callback(result.image);
    }).catch(err => {
      console.log("Error:", err);
    });
  }, 1000 / fps);
};

var saveFrames = (images, gm, offset) => {
  images.map((image, k) => {
    var framePath = path.resolve(__dirname, '../output/', `output-00${offset + k}.jpg`);
    image.save(path.resolve(framePath));
    gm.in(framePath);
  });
}

var saveGIF = (images, callback) => {
  var GM = gm();
  saveFrames(images, GM, 0);
  images.reverse();
  saveFrames(images, GM, images.length);
  GM.delay(200).write(path.resolve(__dirname, '../output/', 'animated.gif'), (err) => {
    if (err) console.log("ERROR:", err);
  });
};

module.exports = {
  start,
  run,
  stop,
  getImage,
  saveImage,
  saveGIF
};
