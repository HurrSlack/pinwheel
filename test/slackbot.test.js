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
    bot.should.respondTo('onItemPinned');
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
      var channelInfo = MockTransport.fixtures.channels.info;
      var wrappedNext = bot.includeChannel(function (res, channelResponse) {
        res.should.equal(originalResponse);
        bot.web.channels.info.calledWith(originalResponse.channel_id).should.be.true;
        channelResponse.should.equal(channelInfo);
        done();
      });
      wrappedNext(originalResponse);
    });
  });

  // describe('getMessageInfo', function () {
  //   it('gets a message from a channel at a timestamp', function (done) {
  //     bot.getMessageInfo(channelId, ts, function (messageResponse) {
  //
  //     });
  //   })
  // })

  describe('getFileInfo', function () {
    it('gets a file by id', function (done) {
      var id = 'test-file';
      var fileInfo = MockTransport.fixtures.files.info;
      bot.getFileInfo(id, function (info) {
        bot.web.files.info.calledWith(id).should.be.true;
        info.should.equal(fileInfo.file);
        done();
      });
    });
  });

  describe('onItemPinned', function () {
    it('registers a callback on rtm pin_added event', function (done) {
      var pinEvent = {
        type: slack.RTM_EVENTS.PIN_ADDED,
        channel_id: 'channel-id',
        item: {
          type: 'message'
        }
      };
      transport = new MockTransport({
        rtm: [pinEvent]
      });
      bot = new Slackbot(transport, env);
      bot.onItemPinned(function (evt, channel) {
        evt.should.equal(pinEvent);
        channel.should.be.an('object').which.has.a.property('name');
        done();
      });
      bot.rtm.on.calledWith(slack.RTM_EVENTS.PIN_ADDED).should.be.true;
      bot.connect();
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
    });
  });
});
