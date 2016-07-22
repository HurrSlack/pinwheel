var path = require('path');
var Slackbot = require('./slackbot');
var TwitterPoster = require('./twitter');
var createFakeScreenshot = require('./create-fake-screenshot');
var helpers = require('./helpers');

var env = helpers.getEnv(process);

require('dotenv').config({
  path: path.resolve('./env_variables'),
  silent: env.vars.NODE_ENV !== 'development'
});

var bot = Slackbot(env);
var tweeter = TwitterPoster(env);

bot.onPinAdded(function (message, channelData) {
  console.log('received pin', JSON.stringify(message.item, null, 2));
  var channel = channelData.channel;
  if (!channel.is_member) {
    console.log(
      'pin was in channel #' + channel.name + ', of which i am not a member'
    );
    return;
  }
  console.log(
    'pin was in channel #' + channel.name + ', of which i am a member. post!'
  );
  var text = message.item.message && message.item.message.text;
  if (text && text.length <= 140) {
    tweeter.postTweet(text);
  } else if (text && text.length > 140) {
    console.log('generating tweet for text > 140 characters');
    var trimmedText = text.substring(0, 110) + '…';
    var imageData = createFakeScreenshot(text);
    tweeter.postTweetAndImage(imageData, trimmedText);
  }
});

bot.connect(function onConnected (data) {
  console.log(
    'Logged in as ' + data.self.name + 'of team ' + data.team.name + '\n\n' +
    'listening...'
  );
});
