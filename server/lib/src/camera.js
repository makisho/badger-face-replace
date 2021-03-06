var cv = require('opencv');
var path = require('path');
var gm = require('gm').subClass({ imageMagick: true });

var {
  DEVICE,
  CAM_WIDTH,
  CAM_HEIGHT,
  FPS,
  NO_DETECTION_INTERVAL,
  RESIZE_FACTOR,
  WIDTH_OFFSET_PERCENT,
  Y_OFFSET_PERCENT,
  MASK_IMAGE,
  OUTPUT_IMAGE,
  ALGORITHM_PATH
} = require('../config/camera');

var camera, masks = [];
var redBadger;
var IS_RUNNING = false;

var start = () => {
  camera = new cv.VideoCapture(DEVICE);
  camera.setWidth(CAM_WIDTH);
  camera.setHeight(CAM_HEIGHT);
  IS_RUNNING = true;
};

var stop = () => {
  IS_RUNNING = false;
};

function mergeAdd(pixel_a, pixel_b){
  pixel_a[0] = pixel_a[0] + pixel_b[0];
  pixel_a[1] = pixel_a[1] + pixel_b[1];
  pixel_a[2] = pixel_a[2] + pixel_b[2];
  return pixel_a;
}
function mergeMul(pixel_a, pixel_b){
  pixel_a[0] = Math.floor(pixel_a[0] * pixel_b[0] / 255);
  pixel_a[1] = Math.floor(pixel_a[1] * pixel_b[1] / 255);
  pixel_a[2] = Math.floor(pixel_a[2] * pixel_b[2] / 255);
  return pixel_a;
}

var saveImage = (image, callback) => {
  var imgPath = path.resolve(__dirname, '../../../client/output', OUTPUT_IMAGE);
  redBadger.copyTo(image,0,0);
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
    overlayImage: overlayImage,
    alphaMask: alphaMask,
  }
}

function makeMasks() {
  console.log('making masks');
  cv.readImage(path.resolve(__dirname, '../images/', 'red_badger.jpg'), (err, mat) => { redBadger = mat; });
  if(CAM_WIDTH < 800) redBadger.resize(redBadger.width()/2,redBadger.height()/2);
  var maskImg;
  cv.readImage(path.resolve(__dirname, '../images/', MASK_IMAGE), (err, mat) => { maskImg = mat; });
  var maskSizeRatio = maskImg.height() / maskImg.width();

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
  if (y > 0 && (y + mask.height < CAM_HEIGHT) && (x + mask.width < CAM_WIDTH)) {
    overlayImages(image, mask, x, y);
    return true;
  }
  return false;
}

function getMask(face, masks) {
  var width = face.width * RESIZE_FACTOR;
  width = width + width * WIDTH_OFFSET_PERCENT * 2;
  var maskIndex = Math.floor(width / 10) - 1;
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

      counter++;
      if (counter <= NO_DETECTION_INTERVAL) {
        newImage.detectObject(ALGORITHM_PATH, {}, function(err, faces) {
          if (!err){
            detectedFaces = faces || detectedFaces;
            resolve({image, counter, detectedFaces});
          } else {
            console.log(err);
          }
        });
      } else {
        counter = 0;
        resolve({image, counter, detectedFaces});
      }
    });
  });
}

var run = (callback) => {
  var counter = 0;
  var detectedFaces = [];
  var busy = false;
  return setInterval(() => {
    if (!busy) {
      busy = true;
      getImage(counter, detectedFaces).then(result => {
        counter = result.counter;
        detectedFaces = result.detectedFaces;
        detectedFaces.map(face => {
          if (face.height > 10) {
            var mask = getMask(face, masks);
            var resizedY = face.y * RESIZE_FACTOR;
            var resizedX = face.x * RESIZE_FACTOR;
            applyMask(mask, result.image, resizedX - (face.width * RESIZE_FACTOR * WIDTH_OFFSET_PERCENT), resizedY - (face.height * RESIZE_FACTOR * Y_OFFSET_PERCENT));
          }
        });
        callback(result.image);
        busy = false;
      }).catch(err => {
        console.log("Error:", err);
        busy = false;
      });
    }
  }, 1000 / FPS);
};

var saveFrames = (images, gm, offset) => {
  images.map((image, k) => {
    redBadger.copyTo(image,0,0);
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
