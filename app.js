var path = require('path');
var https = require('https');
var url = require('url');
var assign = require('lodash.assign');
var concat = require('concat-stream');
var LRU = require('lru-cache');
var Slackbot = require('./slackbot');
var TwitterPoster = require('./twitter');
var createFakeScreenshot = require('./create-fake-screenshot');
var helpers = require('./helpers');

var env = helpers.getEnv(process);

require('dotenv').config({
  path: path.resolve('./env_variables'),
  silent: env.vars.NODE_ENV !== 'development'
});

var bot = new Slackbot(require('@slack/client'), env);
var tweeter = TwitterPoster(env);
var log = helpers.logger('App', env.isDev);

var itemCache = LRU({
  max: 5000,
  maxAge: 2.628e9, // one month
  length: function (n, key) { return key.length; }
});

var TWEET_STAGED = 'staged';
function itemToKey (item) {
  return JSON.stringify(item.item || item);
}
var tweetCache = {
  stage: function (item) {
    itemCache.set(itemToKey(item), TWEET_STAGED);
  },
  // TODO: store tweet id in cache so it can be detwote later
  set: function (item, id) {
    itemCache.set(itemToKey(item), id);
  },
  get: function (item) {
    return itemCache.get(itemToKey(item));
  },
  drop: function (item) {
    return itemCache.del(itemToKey(item));
  }
};

tweetCache.stage({});

function postText (item) {
  var twote = tweetCache.get(item);
  if (twote) {
    return log('already twote', item);
  }
  var text = item.message && item.message.text;
  if (text && text.length <= 140) {
    tweeter.postTweet(text);
    tweetCache.stage(item);
  } else if (text && text.length > 140) {
    log('generating tweet for text > 140 characters');
    var trimmedText = text.substring(0, 110) + '…';
    createFakeScreenshot(
      item.message.permalink,
      helpers.handleError(function (image) {
        tweeter.postTweetAndImage(image, trimmedText);
        tweetCache.stage(item);
      })
    );
  }
}

function postFile (item, next) {
  var twote = tweetCache.get(item);
  if (twote) {
    return log('already twote', item);
  }
  bot.getFileInfo(item.file_id, function onFileInfo (info) {
    getImage(info.thumb_960 || info.thumb_480 || info.url_private);
    function getImage (uri) {
      var options = assign(url.parse(uri), {
        headers: {
          'Authorization': 'Bearer ' + env.vars.SLACK_TOKEN
        }
      });
      log('requesting file: ', options);
      https.get(options, function streamResponse (res) {
        if (res.statusCode >= 300 && res.statusCode <= 400) {
          log('redirected to', res.headers.location);
          return getImage(res.headers.location);
        }
        if (res.statusCode !== 200) {
          throw Error(
            'Status code ' + res.statusCode + ' returned for file ' + url
          );
        }
        res.setEncoding('base64');
        res.pipe(concat(function sendImageData (data) {
          log('sending image data to tweeter');
          tweeter.postTweetAndImage(data, info.title);
          tweetCache.stage(item);
        }));
      });
    }
  });
}

var postingStrategies = {
  message: postText,
  file: postFile
};

bot.onItemPinned(function (message, channelData) {
  var channel = channelData.channel;
  if (!channel.is_member) {
    log('pin was in #' + channel.name + ', of which i am not a member');
    return;
  }
  log('pin was in #' + channel.name + ', of which i am a member. posting...');
  var post = postingStrategies[message.item.type];
  if (!post) {
    var resText = JSON.stringify(message);
    throw Error('No strategy to handle this type of pin: ' + resText);
  }
  post(message.item);
});

var tweacji = (env.REACJI_TO_TRIGGER_TWEET || 'pushpin').split(',');
bot.onReacji(tweacji, function (reaction, channelData) {
  var channel = channelData.channel;
  if (!channel.is_member) {
    log('pin was in #' + channel.name + ', of which i am not a member');
    return;
  }
  log('pin was in #' + channel.name + ', of which i am a member. posting...');
  var post = postingStrategies[reaction.item.type];
  if (!post) {
    var resText = JSON.stringify(reaction);
    throw Error('No strategy to handle this type of pin: ' + resText);
  }
  post(reaction.item);
});

bot.connect(function onConnected (data) {
  console.log(
    'Logged in as ' + data.self.name + ' of team ' + data.team.name + '\n\n' +
    'listening...'
  );
});
