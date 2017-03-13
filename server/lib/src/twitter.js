var fs = require('fs');
var path = require('path');
var Twitter = require('twitter');
var {creds , message} = require('../config/twitter');

var client = new Twitter(creds);

var makeMedia = (imgPath, callback) => {
  var newPath = path.resolve(__dirname, '../../../client/output/', imgPath);
  var media = fs.readFileSync(newPath);
  client.post('media/upload', { media }, (error, media, response) => {
    if (error) throw error;
    callback(media.media_id_string);
  });
};

var tweetUser = (screen_name, callback) => (media_id) => {
  var status = {
    status: screen_name + ' ' + message,
    media_ids: media_id
  };

  client.post('statuses/update', status, (error, tweet, response) => {
    if (error) throw error;
    callback();
  });
};

var postImage = (name, imagePath, callback) => {
  makeMedia(imagePath, tweetUser(name, callback));
}

module.exports = {
  postImage
};
