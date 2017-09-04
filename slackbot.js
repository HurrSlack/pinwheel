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

Slackbot.prototype.connect = function (next) {
  if (typeof next === 'function') {
    this.rtm.on(slack.CLIENT_EVENTS.RTM.AUTHENTICATED, next);
  }
  this.rtm.start();
};

module.exports = Slackbot;
