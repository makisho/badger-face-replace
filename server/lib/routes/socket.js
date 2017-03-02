var cv = require('opencv');

// camera properties
var camWidth = 320;
var camHeight = 240;
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

var makeSallies = () => {
  var sallies = [];
  for (var i = 10; i < camWidth; i+= 10) {
    var resized = sallyImg.clone();
    resized.resize(i, i * sallyRatio);
    sallies.push(resized);
  }
  return sallies;
}

module.exports = function (socket) {
  var sallies = makeSallies();
  console.log("MADE BADGERS");
  setInterval(function() {
    camera.read(function(err, im) {
      if (err) throw err;
      var newSrc = new cv.Matrix(im.height(), im.width(), cv.Constants.CV_64FC4);
      // cv.cvtColor(im, newSrc, cv.Constants.CV_BGRA2HSV);

      im.detectObject('./node_modules/opencv/data/haarcascade_frontalface_alt_tree.xml', {}, function(err, faces) {
        if (err) throw err;
        for (var i = 0; i < faces.length; i++) {
          face = faces[i];
          if (face.height > 50) {
            var sallyIndex = Math.floor(face.width / 10) - 1;
            if (sallyIndex < 0) sallyIndex = 0;
            if ((face.y + sallies[sallyIndex].height()) < camHeight) {
              sallies[sallyIndex].copyTo(im, face.x, face.y);
              // console.log(newSrc);
            }
          }
        }

        socket.emit('frame', { buffer: im.toBuffer() });
      });
    });
  }, camInterval);
};
