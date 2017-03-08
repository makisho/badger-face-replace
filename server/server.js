var express = require('express')
  , http = require('http')
  , morgan = require('morgan');

var configServer = require('./lib/config/server');

var app = express();
app.set('port', configServer.httpPort);
app.use(express.static(configServer.staticFolder));
app.use(morgan('dev'));

require('./lib/routes').serveIndex(app, configServer.staticFolder);

var server = http.createServer(app);
server.listen(app.get('port'), function () {
  console.log('HTTP server listening on port ' + app.get('port'));
});

var io = require('socket.io')(server);
io.on('connection', require('./lib/routes/socket'));

var camera = require('./lib/src/camera');
camera.makeMasks();

module.exports.app = app;
