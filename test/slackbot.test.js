/* global describe, it, beforeEach */
var Slackbot = require('../slackbot');
var helpers = require('../helpers');
var slack = require('@slack/client');
var MockTransport = require('./util/mock-transport');

var env = helpers.getEnv({
  env: {
    SLACK_TOKEN: 'test-token',
    NODE_ENV: 'development'
  }
});

describe('Slackbot', function () {
  var transport, bot;
  beforeEach(function () {
    transport = new MockTransport();
    bot = new Slackbot(transport, env);
  });

  it('factory makes a slackbot API interface', function () {
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
        webChannelInfo: channelInfo
      });
      bot = new Slackbot(transport, env);
      var wrappedNext = bot.includeChannel(function (res, channelResponse) {
        res.should.equal(originalResponse);
        bot.web.channels.info.calledWith(originalResponse.channel_id).should.be.true;
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
        webFileInfo: fileInfo
      });
      bot = new Slackbot(transport, env);
      bot.getFileInfo(id, function (info) {
        bot.web.files.info.calledWith(id).should.be.true;
        info.should.equal(fileInfo.file);
        done();
      });
    });
  });

  describe('onPinAdded', function () {
    it('registers a callback on rtm pin_added event', function (done) {
      var pinEvent = { channel_id: 'channel-id' };
      bot.onPinAdded(function (evt, channel) {
        evt.should.equal(pinEvent);
        channel.should.be.an('object').which.has.a.property('name');
        channel.should.have.property('name');
        done();
      });
      bot.rtm.on.calledWith(slack.RTM_EVENTS.PIN_ADDED).should.be.true;
      bot.rtm.emit(slack.RTM_EVENTS.PIN_ADDED, pinEvent);
    });
  });

  describe('connect', function () {
    it('starts the rtm client', function () {
      bot.connect();
      bot.rtm.start.calledOnce.should.be.true;
    });
    it('calls a callback, if provided, when authenticated', function (done) {
      bot.connect(function (evt) {
        evt.should.exist;
        done();
      });
      bot.rtm.emit(slack.CLIENT_EVENTS.RTM.AUTHENTICATED, [{}]);
    });
  });
});
