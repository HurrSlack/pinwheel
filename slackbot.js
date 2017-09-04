var assign = require('lodash.assign');
var helpers = require('./helpers');
var slack = require('@slack/client');

function withDefaultOptions (env, options) {
  var defaultOpts = env.isProd ? {} : { logLevel: 'verbose' };
  return options ? defaultOpts : assign(defaultOpts, options);
}

function Slackbot (transport, env, options) {
  var mergedOptions = withDefaultOptions(env, options);
  this.rtm = new transport.RtmClient(env.vars.SLACK_TOKEN, mergedOptions);
  this.web = new transport.WebClient(env.vars.SLACK_TOKEN, mergedOptions);
  this.logger = helpers.logger('Slackbot', mergedOptions.logLevel === 'verbose');
}

Slackbot.prototype.getMessageInfo = function (channelId, ts, next) {
  var yak = this.logger.sub('getMessageInfo');
  yak('getting message info for', channelId, ts);
  var opts = {
    latest: ts,
    inclusive: true,
    count: 1
  };
  this.web.channels.history(channelId, opts, helpers.handleError(function (res) {
    yak('received array of messages, length', res.messages.length);
    next(res.messages[0]);
  }));
};

Slackbot.prototype.getFileInfo = function (id, next) {
  var yak = this.logger.sub('getFileInfo');
  yak('getting file', id);
  this.web.files.info(id, helpers.handleError(function (res) {
    yak('received file', res.file);
    next(res.file);
  }));
};

Slackbot.prototype.getChannelInfo = function (channelId, next) {
  var yak = this.logger.sub('channelInfo');
  yak('get info for', channelId);
  this.web.channels.info(channelId, helpers.handleError(function (response) {
    yak('channel response for', channelId, response);
    next(response);
  }));
};

Slackbot.prototype.onItemPinned = function (next) {
  // TODO verify use of 'this' in next.call
  // TODO verify change in logger logic
  var yak = this.logger.sub('onItemPinned');
  this.rtm.on(slack.RTM_EVENTS.PIN_ADDED, function (pinEvent) {
    yak('pin added', pinEvent);
    if (!pinEvent.channel_id) {
      next.call(this, pinEvent);
    } else {
      this.getChannelInfo(pinEvent.channel_id, function (channel) {
        next.call(this, pinEvent, channel);
      });
    }
  }.bind(this));
};

Slackbot.prototype.onReacji = function (reacjiWanted, handler) {
  var yak = this.logger.sub('onReacji');
  var matching = typeof reacjiWanted === 'string' ? [reacjiWanted] : reacjiWanted;
  this.rtm.on(slack.RTM_EVENTS.REACTION_ADDED, function (response) {
    if (matching.every(function (reacji) { return reacji !== response.reaction; })) {
      return;
    }
    yak('reacji matching ' + reacjiWanted + ' added', response);
    if (!response.item) {
      return;
    }
    if (response.item.type === 'message' && response.item.channel) {
      yak('type is message and channel is public, so we fetch message info');
      this.getMessageInfo(response.item.channel, response.item.ts, function (message) {
        this.getChannelInfo(response.item.channel, handler.bind(
          this,
          Object.assign({}, response, { message: message })
        ));
      }.bind(this));
    } else if (response.item.type === 'file') {
      yak('type is file, so we put the file_id where it goes');
      handler.call(this, Object.assign({}, response, { file_id: response.item.file }));
    }
  }.bind(this));
};

Slackbot.prototype.connect = function (next) {
  if (typeof next === 'function') {
    this.rtm.on(slack.CLIENT_EVENTS.RTM.AUTHENTICATED, next);
  }
  this.rtm.start();
};

module.exports = Slackbot;
