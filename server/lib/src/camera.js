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

function mergeAdd(pixel_a, pixel_b){
  pixel_a[0] = pixel_a[0] + pixel_b[0];
  pixel_a[1] = pixel_a[1] + pixel_b[1];
  pixel_a[2] = pixel_a[2] + pixel_b[2];
  return pixel_a;
}
function mergeMul(pixel_a, pixel_b){
  pixel_a[0] = pixel_a[0] * pixel_b[0] / 255;
  pixel_a[1] = pixel_a[1] * pixel_b[1] / 255;
  pixel_a[2] = pixel_a[2] * pixel_b[2] / 255;
  return pixel_a;
}

var saveImage = (image, callback) => {
  var imgPath = path.resolve(__dirname, '../../../client/output', OUTPUT_IMAGE);
  image.save(imgPath);
  callback(OUTPUT_IMAGE);
}

function createMaskOverlay(mask){
  var maskHeight = mask.height();
  var maskWidth = mask.width();
  var overlayImage = new cv.Matrix(maskHeight, maskWidth);

  var channels = mask.split();
  var bgr = [channels[0], channels[1], channels[2]];
  var alpha = channels[3];
  alpha.cvtColor('CV_GRAY2BGR');

  var alphaMask = channels[3].clone();
  alphaMask.bitwiseNot(alphaMask);

  overlayImage.merge(bgr);
  for( x = 0; x < maskHeight; x++) {
    for (y = 0; y < maskWidth; y++) {
      overlayImage.pixel(y,x,mergeMul(overlayImage.pixel(y,x), alpha.pixel(y,x)));
    }
  }

  return {
    overlayImage: overlayImage,
    alphaMask: alphaMask,
  }
}

function makeMasks(maskImg, maskSizeRatio) {
  console.log('making masks');
  var maskOverlay = createMaskOverlay(maskImg)
  for (var i = 10; i < CAM_WIDTH; i+= 10) {
    var resizedOverlay = maskOverlay.overlayImage.clone();
    var resizedMask = maskOverlay.alphaMask.clone();
    resizedOverlay.resize(i, i * maskSizeRatio);
    resizedMask.resize(i, i * maskSizeRatio);

    masks.push({
      overlayImage: resizedOverlay,
      alphaMask: resizedMask,
      height: resizedOverlay.height(),
      width: i
    });
  }
}

function overlayImages(base, mask, offset_x, offset_y){
  for(x = 1; x < mask.width; x++){
    for( y = 1; y < mask.height; y++){
      base.pixel(y + offset_y,
                 x + offset_x,
                 mergeAdd(
                   mergeMul(
                     base.pixel(y + offset_y, x + offset_x),
                     mask.alphaMask.pixel(y, x)
                   ),
                   mask.overlayImage.pixel(y,x)
                 ))
    }
  }
}

function applyMask(mask, image, x, y) {
  if ((y + mask.height < CAM_HEIGHT) && (x + mask.width < CAM_WIDTH)) {
    overlayImages(image, mask, x, y);
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
        if (!err){
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
        } else {
          console.log(err);
        }
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
  var gifPath = path.resolve(__dirname, '../../../client/output/', 'animated.gif');
  GM.delay(200).write(gifPath, (err) => {
    if (err) console.log("ERROR:", err);
    callback('animated.gif');
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
