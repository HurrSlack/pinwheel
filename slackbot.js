var slack = require('@slack/client');
var assign = require('lodash.assign');
var helpers = require('./helpers');

function clientOptions (env, options) {
  var defaultOpts = env.isProd ? {} : { logLevel: 'verbose' };
  return options ? defaultOpts : assign(defaultOpts, options);
}

var exports = {
  getSlackRtmClient: function (env, options) {
    var clientOpts = clientOptions(env, options);
    return new slack.RtmClient(env.vars.SLACK_TOKEN, clientOpts);
  },
  getSlackWebClient: function (env, options) {
    var clientOpts = clientOptions(env, options);
    return new slack.WebClient(env.vars.SLACK_TOKEN, clientOpts);
  },
  getLogger: function (env, options) {
    var clientOpts = clientOptions(env, options);
    return helpers.logger('Slackbot', clientOpts.logLevel === 'verbose');
  },
  Slackbot: function (rtm, web, verbose) {
    function includeChannel (next) {
      var yak = verbose.sub('includeChannel');
      return function addChannelToResponse (response) {
        if (!response.channel_id) {
          yak('no channel_id found, will not place call', response);
          return next(response);
        }
        yak('channel_id found in response, get info for', response.channel_id);
        return web.channels.info(
          response.channel_id,
          helpers.handleError(function (channelRes) {
            yak('channel response for', response.channel_id, channelRes);
            next(response, channelRes);
          }));
      };
    }
    function getFileInfo (id, next) {
      var yak = verbose.sub('getFileInfo');
      yak('getting file', id);
      web.files.info(id, helpers.handleError(function (res) {
        yak('received file', res.file);
        next(res.file);
      }));
    }
    function onPinAdded (next) {
      rtm.on(slack.RTM_EVENTS.PIN_ADDED, includeChannel(function (res, chan) {
        verbose('onPinAdded', res);
        next.call(this, res, chan);
      }));
    }
    function connect (next) {
      rtm.on(slack.CLIENT_EVENTS.RTM.AUTHENTICATED, next);
      rtm.start();
    }
    return {
      getFileInfo: getFileInfo,
      onPinAdded: onPinAdded,
      connect: connect
    };
  }
};

module.exports = exports;
