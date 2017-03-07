var socket = io.connect('http://localhost');

var canvas = document.getElementById('canvas-video');
var resultImg = document.getElementById('result-img');
var loadingImg = document.getElementById('loading');
var tweet = document.getElementById('twitter');

var startButton = document.getElementById('start');
var takePictureButton = document.getElementById('picture');
var takeVideoButton = document.getElementById('video');

var context = canvas.getContext('2d');
var img = new Image();

function _arrayBufferToBase64( buffer ) {
    var binary = '';
    var bytes = new Uint8Array( buffer );
    var len = bytes.byteLength;
    for (var i = 0; i < len; i++) {
        binary += String.fromCharCode( bytes[ i ] );
    }
    return window.btoa( binary );
}

socket.on('frame', function (data) {
  var base64String = _arrayBufferToBase64(data.buffer);
  img.onload = function () {
    context.drawImage(this, 0, 0, canvas.width, canvas.height);
  };
  img.src = 'data:image/png;base64,' + base64String;
});

function hideElem(elem) { elem.style.display = 'none'; }
function showElem(elem) { elem.style.display = 'inline-block'; }

function disableButton(button) {
  button.disabled = true;
  hideElem(button);
}

function enableButton(button) {
  button.disabled = false;
  showElem(button);
}

socket.on('showImage', (data) => {
  resultImg.src = '/output/' + data.imgPath + '?' + new Date().getTime();;

  showElem(resultImg);
  hideElem(canvas);
  hideElem(loadingImg);

  enableButton(startButton);
  showElem(twitter);
});

function disableAllButtons() {
  disableButton(startButton);
  disableButton(takePictureButton);
  disableButton(takeVideoButton);
}

function startCamera() {
  socket.emit('startCamera');

  showElem(canvas);
  hideElem(loadingImg);
  hideElem(resultImg);
  hideElem(twitter);

  disableButton(startButton);
  enableButton(takePictureButton);
  enableButton(takeVideoButton);
}

function startLoading() {
  showElem(loadingImg);
  hideElem(resultImg);
  hideElem(canvas);
};

socket.on('isLoading', startLoading);

function takePicture() {
  socket.emit('takePicture');
  disableAllButtons();
}

function takeVideo() {
  socket.emit('takeVideo');
  disableAllButtons();
}

startLoading();
startCamera();
