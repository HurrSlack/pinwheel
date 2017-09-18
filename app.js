var path = require('path');
var Slackbot = require('./slackbot');
var TwitterPoster = require('./twitter');
var TweetCache = require('./cache');
var Pin = require('./pin');
var helpers = require('./helpers');

var env = helpers.getEnv(process);

require('dotenv').config({
  path: path.resolve('./env_variables'),
  silent: env.vars.NODE_ENV !== 'development'
});

var bot = new Slackbot(require('@slack/client'), env);
var tweeter = TwitterPoster(env);
var log = helpers.logger('App');

var tweetCache = new TweetCache(env);

var tweacji = (env.REACJI_TO_TRIGGER_TWEET || 'pushpin').split(',');
var tweacjiFormatted = tweacji.map(function (ji) { return `:${ji}:`; });
var tweacjiList = tweacjiFormatted.pop();
if (tweacjiFormatted.length > 0) {
  tweacjiList = tweacjiFormatted.join(', ') + ' or ' + tweacjiList;
}

bot.onItemPinned(function (event, channelData) {
  var thing = 'something';
  if (event.item && event.item.message && event.item.message.permalink) {
    thing = event.item.message.permalink;
  }
  var text = `You just pinned ${thing} in #${channelData.channel.name}. Were you trying to get the Pinwheel bot to tweet it? *We've switched to using reacji instead of pins*, because pins are annoying and limited. So go react with ${tweacjiList} instead!`;
  bot.dmUser(event.user, text);
});

bot.onReacji(tweacji, function (reaction, channelData) {
  var channel = channelData && channelData.channel;
  if (channel && !channel.is_member) {
    log('pin was in #' + channel.name + ', of which i am not a member');
    return;
  } else if (channel) {
    log('pin was in #' + channel.name + ', of which i am a member. posting...');
  } else {
    log('could not detect channel data, trying to pin anyway?', reaction);
  }
  (new Pin(env, bot, tweeter, tweetCache)).post(reaction);
});

bot.connect(function onConnected (data) {
  log(
    'Logged in as ' + data.self.name + ' of team ' + data.team.name + '\n\n' +
    'listening...'
  );
});
