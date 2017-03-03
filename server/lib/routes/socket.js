var cv = require('opencv');

// camera properties
var camWidth = 640;
var camHeight = 480;
var camFps = 5;
var camInterval = 1000 / camFps;

// face detection properties
var rectColor = [0, 255, 0];
var rectThickness = 2;

// initialize camera
var camera = new cv.VideoCapture(0);
camera.setWidth(camWidth);
camera.setHeight(camHeight);

var sallyImg;
cv.readImage('lib/images/badger.jpg', (err, mat) => {
  sallyImg = mat;
});
var sallyRatio = sallyImg.height() / sallyImg.width();

var makeScaledFaces = () => {
  var sallies = [];
  for (var i = 10; i < camWidth; i+= 10) {
    var resized = sallyImg.clone();
    resized.resize(i, i * sallyRatio);
    sallies.push(resized);
  }
  return sallies;
}

function applyMask(mask, image, x, y) {
  if ((y + mask.height() < camHeight) && (x + mask.width() < camWidth)) {
    mask.copyTo(image, x, y);
    return true;
  }
  return false;
}

function getMask(face, scaledFaces) {
  var maskIndex = Math.floor(face.width * 4 / 10) - 1;
  if (maskIndex < 0) maskIndex = 0;
  return scaledFaces[maskIndex];
}

module.exports = function (socket) {
  var scaledFaces = makeScaledFaces();
  console.log("MADE BADGERS");

  var counter = 0;
  var face_backup;
  setInterval(function() {
    camera.read(function(err, im) {
      if (err) throw err;

      im = im.flip(1);

      var newIm = im.copy();
      newIm.resize(im.width()/4, im.height()/4);

      newIm.detectObject('./node_modules/opencv/data/haarcascade_frontalface_alt_tree.xml', {}, function(err, faces) {

        if (err) throw err;

        counter++;
        if (counter >= 1) {
          face_backup = faces;
          counter = 0;
        }
        faces = face_backup || faces;

        faces.map(face => {
            if (face.height > 10) {
              var mask = getMask(face, scaledFaces);
              applyMask(mask, im, face.x * 4, face.y * 4);
            }
          });

        socket.emit('frame', { buffer: im.toBuffer() });
      });

    });
  }, camInterval);
};
