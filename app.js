var Twit = require('twit');
var path = require('path');
var Slackbot = require('node-slackbot');

require('dotenv').config({
  path: path.resolve('./env_variables'),
  silent: process.env.NODE_ENV !== 'development'
});

var T = new Twit({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token: process.env.TWITTER_ACCESS_TOKEN,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
});

var bot = new Slackbot(process.env.SLACK_TOKEN);

function postTweet (text) {
  T.post('statuses/update', { status: text }, (err, data, res) => {
    if (err) {
      console.error(err);
    } else {
      console.log('twote "' + text + '", received: ', data);
    }
  });
}

bot.use(function (message, cb) {
  if (message.type === 'pin_added') {
    console.log('received pin', JSON.stringify(message.item, null, 2));
    var text = message.item.message && message.item.message.text;
    if (text && text.length <= 140) {
      postTweet(text);
    } else if (text && text.length > 140) {
      var trimmedText = text.substring(0, 138) + '…';
      postTweet(trimmedText);
    }
  }
});

bot.connect();
console.log('listening...');
