var cv = require('opencv');
var path = require('path');
var gm = require('gm').subClass({ imageMagick: true });

var {
  DEVICE,
  CAM_WIDTH,
  CAM_HEIGHT,
  FPS,
  DETECTION_INTERVAL,
  RESIZE_FACTOR,
  Y_OFFSET_PERCENT,
  MASK_IMAGE,
  OUTPUT_IMAGE,
  ALGORITHM_PATH
} = require('../config/camera');

var camera, masks = [];
var IS_RUNNING = false;

var start = () => {
  camera = new cv.VideoCapture(DEVICE);
  camera.setWidth(CAM_WIDTH);
  camera.setHeight(CAM_HEIGHT);
  IS_RUNNING = true;
};

var stop = () => {
  camera.release();
  IS_RUNNING = false;
};

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
  for( x = 0; x < maskWidth; x++) {
    for (y = 0; y < maskHeight; y++) {
      overlayImage.pixel(y,x,mergeMul(overlayImage.pixel(y,x), alpha.pixel(y,x)));
    }
  }

  return {
    overlayImage,
    alphaMask,
  }
}

function makeMasks() {
  console.log('making masks');
  var maskImg;
  cv.readImage(path.resolve(__dirname, '../images/', MASK_IMAGE), (err, mat) => { maskImg = mat; });
  var maskSizeRatio = maskImg.height() / maskImg.width();

  var maskOverlay = createMaskOverlay(maskImg)
  for (var i = 10; i < CAM_WIDTH; i+= 10) {
    var resizedOverlay = maskOverlay.overlayImage.clone();
    var resizedMask = maskOverlay.alphaMask.clone();
    resizedOverlay.resize(i, i * maskSizeRatio);
    resizedMask.resize(i, i * maskSizeRatio);
    var maskBuffer = [];
    for( x = 0; x < i; x++) {
      for (y = 0; y < resizedOverlay.height(); y++) {
        var alpha_pixel = resizedMask.pixel(y,x);
        if(!(alpha_pixel[0] || alpha_pixel[1] || alpha_pixel[2])) maskBuffer.push([x,y,resizedOverlay.pixel(y,x)]);
      }
    }

    masks.push({
      maskBuffer,
      height: resizedOverlay.height(),
      width: i
    });
  }
  console.log('done making masks');
}

function overlayImages(base, mask, offset_x, offset_y){
  mask.maskBuffer.map(mask => {
      base.pixel(mask[1] + offset_y, mask[0] + offset_x, mask[2]);
    });
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
          if (counter >= DETECTION_INTERVAL - 1) {
            detectedFaces = faces;
            counter = 0;
          }

          faces = detectedFaces || faces;
          faces.map(face => {
            if (face.height > 10) {
              var mask = getMask(face, masks);
              var resizedY = face.y * RESIZE_FACTOR;
              applyMask(mask, image, face.x * RESIZE_FACTOR, resizedY - (resizedY * Y_OFFSET_PERCENT));
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

var run = (callback) => {
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
  }, 1000 / FPS);
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
  GM.write(gifPath, (err) => {
    if (err) console.log("ERROR:", err);
    callback('animated.gif');
  });
};

module.exports = {
  makeMasks,
  start,
  run,
  stop,
  getImage,
  saveImage,
  saveGIF
};
