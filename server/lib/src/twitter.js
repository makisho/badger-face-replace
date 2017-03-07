var Twitter = require('twitter');
var creds = require('../config/twitter');

var client = new Twitter(creds);

var tweet = (screen_name) => {
  var params = { screen_name };
  console.log("tweeting at", screen_name);
  client.post('statuses/update', { status: screen_name + ' hi!'}, (error, tweet, response) => {
    if (error) throw error;
    console.log('Tweet:', tweet);
    console.log('Response:', tweet);
  });
};

module.exports = {
  tweet
};
