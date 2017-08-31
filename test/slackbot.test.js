/* global describe, it, beforeEach */
var Slackbot = require('../slackbot');
var helpers = require('../helpers');
var slack = require('@slack/client');
var sinon = require('sinon');

var env = helpers.getEnv({
  env: {
    SLACK_TOKEN: 'test-token',
    NODE_ENV: 'development'
  }
});

function MockTransport (stubs) {
  stubs = stubs || {};
  this.RtmClient = function () {
    this.on = sinon.spy(stubs.rtmOn);
    this.start = sinon.spy(stubs.rtmStart);
  };
  this.WebClient = function () {
    this.channels = {
      info: sinon.spy(stubs.webChannelsInfo)
    };
    this.files = {
      info: sinon.spy(stubs.webFilesInfo)
    };
  };
}

describe('the slackbot factory', function () {
  var transport, bot;
  beforeEach(function () {
    transport = new MockTransport();
    bot = new Slackbot(transport, env);
  });

  it('returns a slackbot API interface', function () {
    bot.should.be.an('object');
    bot.should.respondTo('connect');
    bot.should.respondTo('onPinAdded');
    bot.should.respondTo('getFileInfo');
  });

  describe('includeChannel', function () {
    it('ignores the channel if no channel_id is found', function (done) {
      var response = {};
      var next = bot.includeChannel(function (res) {
        res.should.equal(response);
        done();
      });
      next(response);
    });
    it('includes the channel if channel_id is found', function (done) {
      var originalResponse = {channel_id: 'channel-id'};
      var channelInfo = { name: 'channel-name' };
      transport = new MockTransport({
        webChannelsInfo: function (requestedChannelId, cb) {
          requestedChannelId.should.equal(originalResponse.channel_id);
          setImmediate(cb.bind(null, null, channelInfo));
        }
      });
      bot = new Slackbot(transport, env);
      var wrappedNext = bot.includeChannel(function (res, channelResponse) {
        res.should.equal(originalResponse);
        bot.web.channels.info.called.should.be.true;
        channelResponse.should.equal(channelInfo);
        done();
      });
      wrappedNext(originalResponse);
    });
  });

  describe('getFileInfo', function () {
    it('gets a file by id', function (done) {
      var id = 'test-file';
      var fileInfo = { file: 'result-file' };
      transport = new MockTransport({
        webFilesInfo: function (requestedFileId, cb) {
          requestedFileId.should.equal(id);
          setImmediate(cb.bind(null, null, fileInfo));
        }
      });
      bot = new Slackbot(transport, env);
      bot.getFileInfo(id, function (info) {
        bot.web.files.info.called.should.be.true;
        info.should.equal(fileInfo.file);
        done();
      });
    });
  });

  describe('onPinAdded', function () {
    it('registers a callback on rtm pin_added event', function (done) {
      var pinEvent = { channel_id: 'channel-id' };
      var channelInfo = { name: 'channel-name' };
      transport = new MockTransport({
        webChannelsInfo: function (requestedChannelId, cb) {
          requestedChannelId.should.equal(pinEvent.channel_id);
          setImmediate(cb.bind(null, null, channelInfo));
        },
        rtmOn: function (evt, cb) {
          setImmediate(cb.bind(null, pinEvent));
        }
      });
      bot = new Slackbot(transport, env);
      bot.onPinAdded(function (evt, channel) {
        bot.rtm.on.calledWith(slack.RTM_EVENTS.PIN_ADDED).should.be.true;
        evt.should.equal(pinEvent);
        channel.should.equal(channelInfo);
        done();
      });
    });
  });

  describe('connect', function () {
    it('authenticates and starts the rtm client', function (done) {
      transport = new MockTransport({
        rtmOn: function (evt, cb) {
          setImmediate(cb);
        }
      });
      bot = new Slackbot(transport, env);
      bot.connect(function () {
        bot.rtm.on.calledWith(slack.CLIENT_EVENTS.RTM.AUTHENTICATED).should.be.true;
        bot.rtm.start.calledOnce.should.be.true;
        done();
      });
    });
  });
});
