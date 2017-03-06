var socket = io.connect('http://localhost');

var canvas = document.getElementById('canvas-video');
var context = canvas.getContext('2d');
var img = new Image();

context.fillStyle = '#333';
context.fillText('Loading...', canvas.width/2-30, canvas.height/3);

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

function hideElem(id) {
  document.getElementById(id).style.display = 'none';
}

function showElem(id) {
  document.getElementById(id).style.display = 'block';
}

socket.on('gif', (data) => {
  var gifElem = document.getElementById('gif-block');
  gifElem.src = '../output/animated.gif?' + new Date().getTime();;

  hideElem('canvas-video');
  showElem('gif-block');

  document.getElementById('start').disabled = false;
});

function disableAllButtons() {
  document.getElementById('start').disabled = true;
  document.getElementById('picture').disabled = true;
  document.getElementById('video').disabled = true;
}

function startCamera() {
  socket.emit('startCamera');
  showElem('canvas-video');
  hideElem('gif-block');
  document.getElementById('start').disabled = true;
  document.getElementById('picture').disabled = false;
  document.getElementById('video').disabled = false;
}

function stopCamera() {
  socket.emit('takePicture');
  document.getElementById('start').disabled = false;
  document.getElementById('picture').disabled = true;
  document.getElementById('video').disabled = true;
}

function takeVideo() {
  socket.emit('takeVideo');
  disableAllButtons();
}

startCamera();
