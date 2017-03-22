# Badger Face Replace

Replace your face with badgers (or whatever image you upload). Based on the [real-time face detection app](https://github.com/drejkim/face-detection-node-opencv) using OpenCV, Node.js, and WebSockets built by Esther Jun Kim.

## Requirements

* [Node.js](http://nodejs.org/)
* [OpenCV 2.4.x](http://opencv.org/)
* [ImageMagick](https://www.imagemagick.org) – homebrew: `brew install imagemagick`
* [GraphicsMagick](http://www.graphicsmagick.org/) – homebrew: `brew install graphicsmagick`
* [pm2](https://github.com/Unitech/pm2), a process manager for node.js that will restart the app in case of errors - `npm install -g pm2` [optional]
* A webcam, e.g. laptop-integrated webcam, USB webcam

## Installing Node.js packages

* Navigate to the `server` directory
* To install the packages: `npm install`

## Replacing the mask image

* Add your image (in PNG format) to the `server/lib/images` directory
* Update the `MASK_IMAGE` constant in `server/lib/config/camera.js`

## Running the demo

* Make sure you are still in the `server` directory
* To run the server: `pm2 start server.js`
* To run the demo locally, open a browser and go to `localhost:8080`
* To shutdown the server: `pm2 stop server`

The app should be up and running!
