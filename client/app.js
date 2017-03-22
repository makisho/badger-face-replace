var socket = io.connect('http://localhost');

var container = document.getElementById('container');
var canvas = document.getElementById('canvas-video');
var resultImg = document.getElementById('result-img');
var loadingImg = document.getElementById('loading');
var tweet = document.getElementById('tweet-submit');
var tweetConfirmation = document.getElementById('tweet-confirmation')
var tweetSpinner = document.getElementById('tweet-spinner');
var tweetError = document.getElementById('twitter-error');
var countdown = document.getElementById('countdown');

var startButton = document.getElementById('start');
var takePictureButton = document.getElementById('picture');
var takeVideoButton = document.getElementById('video');

var context = canvas.getContext('2d');
var img = new Image();
var displayedImgPath;

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
  displayedImgPath = data.imgPath;
  resultImg.src = '/output/' + data.imgPath + '?' + new Date().getTime();;
  container.className = 'container-result';
  showElem(resultImg);
  hideElem(canvas);
  hideElem(loadingImg);

  enableButton(startButton);
  showElem(tweet);

});

function disableAllButtons() {
  disableButton(startButton);
  disableButton(takePictureButton);
  disableButton(takeVideoButton);
}

function startCamera() {
  socket.emit('startCamera');
  container.className = '';
  showElem(canvas);
  hideElem(loadingImg);
  hideElem(resultImg);
  hideElem(tweet);
  hideElem(tweetConfirmation);
  hideElem(tweetSpinner);
  hideElem(tweetError);

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

socket.on('tweetSent', () => {
  hideElem(tweetSpinner);
  hideElem(tweetError);
  showElem(tweetConfirmation);
});

function count(n, action){
  disableAllButtons();
  countdown.innerHTML = n;
  countdown.style.display = 'block';

  var t = setInterval(()=>{
    countdown.innerHTML = --n;
  }, 1000);

  setTimeout(()=>{
    clearInterval(t)
    action();
    hideElem(countdown);
  }, n * 1000);
}

function takePicture() {
  count(3, () => {
    socket.emit('takePicture');
  });
}

function takeVideo() {
  count(3, () => {
    socket.emit('takeVideo');
  });
}

socket.on('twitterError', () => {
  showElem(tweet);
  showElem(tweetError);
  hideElem(tweetSpinner);
});

function formatInput(input) {
  var slicedInput = input.slice(0, -4);
  return slicedInput === '<br>' ? slicedInput : input;
}

tweet.addEventListener('submit', (event) => {
  event.preventDefault();
  hideElem(tweet);
  hideElem(tweetError);
  showElem(tweetSpinner);

  socket.emit('tweet', {
    handles: formatInput(event.target.children[1].innerHTML),
    imagePath: displayedImgPath
  });
});

startLoading();
startCamera();
