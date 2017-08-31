/**
 * Fake transport object for use in testing slackbot.
 * RTMClient is a real event emitter.
 */
var EventEmitter = require('events');
var sinon = require('sinon');

function MockRtmClient () {
  EventEmitter.apply(this, arguments);
  sinon.spy(this, 'start');
  sinon.spy(this, 'on');
}
MockRtmClient.prototype = new EventEmitter();
MockRtmClient.prototype.start = function () {};

function MockInfoYieldingClient (fixture) {
  this.fixture = fixture;
  sinon.spy(this, 'info');
}
MockInfoYieldingClient.prototype.info = function (id, cb) {
  setImmediate(cb.bind(null, null, this.fixture));
};

function MockWebClient () {
  this.channels = new MockInfoYieldingClient(this.fixtures.webChannelInfo);
  this.files = new MockInfoYieldingClient(this.fixtures.webFileInfo);
}
MockWebClient.prototype.fixtures = {
  webChannelInfo: { name: 'default-channel' },
  webFileInfo: { file: 'default-file' }
};

function MockTransport (fixtures) {
  this.RtmClient = MockRtmClient;
  this.WebClient = function MockWebClientWithFixtures () {
    if (fixtures) {
      this.fixtures = Object.assign({}, this.fixtures, fixtures);
    }
    MockWebClient.apply(this);
  };
  this.WebClient.prototype = new MockWebClient();
}

MockTransport.RtmClient = MockRtmClient;
MockTransport.WebClient = MockWebClient;

module.exports = MockTransport;
