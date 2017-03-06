var cv = require('opencv');

// camera properties
var camWidth = 1280;
var camHeight = 720;
var camFps = 5;
var camInterval = 1000 / camFps;

// face detection properties
var rectColor = [0, 255, 0];
var rectThickness = 2;
var resizeFactor = 4;

// TODO: KEEP
var camera = new cv.VideoCapture(0);
var ALGORITHM_PATH = './node_modules/opencv/data/haarcascade_frontalface_alt_tree.xml';

camera.setWidth(camWidth);
camera.setHeight(camHeight);

var maskImg;
cv.readImage('lib/images/badger.jpg', (err, mat) => { maskImg = mat; });
var maskSizeRatio = maskImg.height() / maskImg.width();

var makemasks = () => {
  var masks = [];
  for (var i = 10; i < camWidth; i+= 10) {
    var resized = maskImg.clone();
    resized.resize(i, i * maskSizeRatio);
    masks.push(resized);
  }
  return masks;
}

function applyMask(mask, image, x, y) {
  if ((y + mask.height() < camHeight) && (x + mask.width() < camWidth)) {
    mask.copyTo(image, x, y);
    return true;
  }
  return false;
}

function getMask(face, masks) {
  var maskIndex = Math.floor(face.width * resizeFactor / 10) - 1;
  if (maskIndex < 0) maskIndex = 0;
  return masks[maskIndex];
}

var getImage = (counter, face_backup) => {
  var imagePromise = new Promise((resolve, reject) => {
    camera.read(function(err, image) {
      if (err) reject(err);

      image = image.flip(1);

      var newImage = image.copy();
      newImage.resize(image.width()/resizeFactor, image.height()/resizeFactor);

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
            applyMask(mask, image, face.x * resizeFactor, face.y * resizeFactor);
          }
        });

        resolve({image, counter, face_backup});
      });
    });
  });
}

module.exports = function (socket) {
  var masks = makemasks();

  var counter = 0;
  var face_backup;

  setInterval(function() {
    var result = getImage(counter, face_backup);
    counter = result.counter;
    face_backup = result.face_backup;
    socket.emit('frame', { buffer: result.image.toBuffer() });
  }, camInterval);
};
