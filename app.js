var Twit = require('twit');
var path = require('path');
var Slackbot = require('./slackbot');

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

var bot = Slackbot(process.env.SLACK_TOKEN);
var Canvas = require('canvas');
var CanvasTextWrapper = require('canvas-text-wrapper').CanvasTextWrapper;

function postTweet (text) {
  T.post('statuses/update', {
    status: text
  }, (err, data, res) => {
    if (err) {
      console.error(err);
    } else {
      console.log('twote "' + text + '", received: ', data);
    }
  });
}

function postTweetAndImage (image, trimmedText) {
  T.post('media/upload', {
    media_data: image
  }, function (err, data, response) {
    if (err) {
      throw err;
    }
    var mediaIdStr = data.media_id_string;
    var meta = {
      media_id: mediaIdStr,
      alt_text: {
        text: trimmedText
      }
    };

    T.post('media/metadata/create', meta, function (err, data, response) {
      if (!err) {
        var params = {
          status: trimmedText,
          media_ids: [mediaIdStr]
        };

        T.post('statuses/update', params, function (err, data, response) {
          if (err) {
            throw err;
          }
          console.log(data);
        });
      }
    });
  });
}

function createSlackImage (canvas, text, time) {
  var ctx = canvas.getContext('2d');

  time = '4:20PM';

  ctx.fillStyle = 'white'; // background color
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#2c2d30'; // stroke color

  ctx.beginPath();
  ctx.moveTo(30, 30);
  ctx.lineTo(90, 30);
  ctx.quadraticCurveTo(100, 30, 100, 40);
  ctx.lineTo(100, 100);
  ctx.quadraticCurveTo(100, 110, 90, 110);
  ctx.lineTo(30, 110);
  ctx.quadraticCurveTo(20, 110, 20, 100);
  ctx.lineTo(20, 40);
  ctx.quadraticCurveTo(20, 30, 30, 30);
  ctx.stroke();

  ctx.fillStyle = '#2c2d30'; // text color
  var options = {
    font: 'bold 24px Arial', // Lato
    lineHeight: 1.375,
    paddingX: 120,
    paddingY: 20
  };
  CanvasTextWrapper(canvas, 'Hurr Slack', options);

  ctx.fillStyle = '#9e9ea6'; // text color
  options = {
    font: '15px Arial', // Lato
    lineHeight: 1.375,
    paddingX: 250,
    paddingY: 30
  };
  CanvasTextWrapper(canvas, time, options);

  ctx.fillStyle = '#2c2d30'; // text color
  options = {
    font: '24px Arial', // Lato
    lineHeight: 1.375,
    paddingX: 120,
    paddingY: 55
  };
  CanvasTextWrapper(canvas, text, options);
}

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
    postTweet(text);
  } else if (text && text.length > 140) {
    console.log('generating tweet for text > 140 characters');
    var trimmedText = text.substring(0, 110) + '…';
    var canvas = new Canvas(880, 400);
    createSlackImage(canvas, text);
    var imageData = canvas.toDataURL('image/png');
    imageData = imageData.split(',')[1];
    postTweetAndImage(imageData, trimmedText);
  }
});

bot.connect(function onConnected (data) {
  console.log(
    'Logged in as ' + data.self.name + 'of team ' + data.team.name + '\n\n' +
    'listening...'
  );
});
