var slack = require('@slack/client');
var helpers = require('./helpers');

function Slackbot (env) {
  var clientOpts = env.isProd ? {} : { logLevel: 'verbose' };
  var rtm = new slack.RtmClient(env.vars.SLACK_TOKEN, clientOpts);
  var web = new slack.WebClient(env.vars.SLACK_TOKEN, clientOpts);
  function includeChannel (next) {
    return function addChannelToResponse (response) {
      if (!response.channel_id) {
        return next(response);
      }
      return web.channels.info(
        response.channel_id,
        helpers.handleError(function (channelRes) {
          next(response, channelRes);
        }));
    };
  }
  function onPinAdded (next) {
    rtm.on(slack.RTM_EVENTS.PIN_ADDED, includeChannel(next));
  }
  function connect (next) {
    rtm.on(slack.CLIENT_EVENTS.RTM.AUTHENTICATED, next);
    rtm.start();
  }
  return {
    onPinAdded: onPinAdded,
    connect: connect
  };
}

module.exports = Slackbot;
