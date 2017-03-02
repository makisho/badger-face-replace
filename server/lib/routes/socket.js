var cv = require('opencv');

// camera properties
var camWidth = 640;
var camHeight = 480;
var camFps = 10;
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

function copyNewFaces(newFaces, image) {
  newFaces.map(({face, x, y}) => {
    if ((y + face.height() < camHeight) && (x + face.width() < camWidth)) {
      face.copyTo(image, x, y);
    }
  });
  return image;
}

module.exports = function (socket) {
  var scaledFaces = makeScaledFaces();
  console.log("MADE BADGERS");

  var face_list = [];
  var counter = 0;

  setInterval(function() {
    camera.read(function(err, im) {
      if (err) throw err;

      var newImage = im;
      var new_face_list = [];

      im.detectObject('./node_modules/opencv/data/haarcascade_frontalface_alt_tree.xml', {}, function(err, faces) {
        if (err) throw err;

        faces.map(face => {
          if (face.height > 20) {
            var newFaceIndex = Math.floor(face.width / 10) - 1;
            if (newFaceIndex < 0) newFaceIndex = 0;
            new_face_list.push({ face: scaledFaces[newFaceIndex], x: face.x, y: face.y });
          }
        });

        if (counter >= 5 && new_face_list.length > 0) {
          face_list = new_face_list;
          newImage = copyNewFaces(face_list, im);
          counter = 0;
          face_list = [];
        }

        counter++;
        socket.emit('frame', { buffer: newImage.toBuffer() });
      });
    });
  }, camInterval);
};
