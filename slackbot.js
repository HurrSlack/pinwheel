var slack = require('@slack/client');

var PROD = process.env.NODE_ENV !== 'development';
var clientOpts = PROD ? {} : { logLevel: 'verbose' };

function handleError (next) {
  return function handlesError (err, response) {
    if (err) {
      throw err;
    }
    next(response);
  };
}

function Slackbot (token) {
  var rtm = new slack.RtmClient(token, clientOpts);
  var web = new slack.WebClient(token, clientOpts);
  function includeChannel (next) {
    return function addChannelToResponse (response) {
      if (!response.channel_id) {
        return next(response);
      }
      return web.channels.info(
        response.channel_id,
        handleError(function (channelRes) {
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
