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

Slackbot.prototype.includeChannel = function (next) {
  var yak = this.logger.sub('includeChannel');
  return (function (web) {
    return function (response) {
      if (!response.channel_id) {
        yak('no channel_id found, will not place call', response);
        return next(response);
      }
      yak('channel_id found in response, get info for', response.channel_id);
      return web.channels.info(
        response.channel_id,
        helpers.handleError(function (channelResponse) {
          yak('channel response for', response.channel_id, channelResponse);
          next(response, channelResponse);
        }));
    };
  })(this.web);
};

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

Slackbot.prototype.onItemPinned = function (next) {
  // TODO verify use of 'this' in next.call
  // TODO verify change in logger logic
  var yak = this.logger.sub('onItemPinned');
  this.rtm.on(slack.RTM_EVENTS.PIN_ADDED, this.includeChannel(function (response, channelResponse) {
    yak('pin added', response);
    next.call(this, response, channelResponse);
  }));
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
    if (response.item.type === 'message') {
      yak('type is message, so we fetch message info');
      this.getMessageInfo(response.item.channel, response.item.ts, function (message) {
        handler.call(this, Object.assign({}, response, { message: message }));
      });
    } else if (response.item.type === 'file') {
      yak('type is file, so we put the file_id where it goes');
      handler.call(this, Object.assign({}, response, { file_id: response.item.file }));
    }
    if (!(response.item && response.item.type === 'message')) {
      return;
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
