/**
 * Fake transport object for use in testing slackbot.
 * RTMClient is a real event emitter.
 */
var EventEmitter = require('events');
var slack = require('@slack/client');
var sinon = require('sinon');

// Mock RTM Behavior
function mockRtmClient (mockEvents) {
  var events = new EventEmitter();
  var eventSequence = mockEvents || [];
  eventSequence.unshift({
    type: slack.CLIENT_EVENTS.RTM.AUTHENTICATED
  });
  sinon.spy(events, 'on');
  var client = {
    on: events.on.bind(events),
    start: function (callback) {
      (function iterate (sequence) {
        if (sequence.length > 0) {
          setImmediate(function () {
            events.emit(sequence[0].type, sequence[0]);
            iterate(sequence.slice(1));
          });
        } else if (callback) {
          callback();
        }
      }(eventSequence));
    }
  };
  sinon.spy(client, 'on');
  sinon.spy(client, 'start');
  return client;
}

var WebFixtureGroups = {
  channels: {
    info: { name: 'default-channel' },
    history: { latest: '00000', messages: [ { type: 'message', text: 'Hello' } ] }
  },
  files: {
    info: { file: 'default-file' }
  }
};

function mockFixtureYieldingClient (fixtures) {
  return Object.keys(fixtures).reduce(function (client, method) {
    client[method] = function () {
      // last argument is callback
      var cb = Array.prototype.pop.call(arguments);
      // bind cb to no context, null as first (error) arg per node convention, then passed arg
      setImmediate(cb.bind(null, null, fixtures[method]));
    };
    sinon.spy(client, method);
    return client;
  }, {});
}

function mockWebClient (fixtureGroups) {
  return Object.keys(fixtureGroups || {}).reduce(function (client, groupName) {
    client[groupName] = mockFixtureYieldingClient(fixtureGroups[groupName]);
    return client;
  }, {});
}

function MockTransport (conf) {
  var rtmConfig = conf && conf.rtm;
  this.RtmClient = mockRtmClient.bind(this, rtmConfig);
  var webConfig = conf && conf.web;
  var webFixtureGroups = Object.assign({}, WebFixtureGroups, webConfig);
  this.WebClient = mockWebClient.bind(this, webFixtureGroups);
}

MockTransport.fixtures = WebFixtureGroups;

module.exports = MockTransport;
