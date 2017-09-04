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

  describe('getMessageInfo', function () {
    it('gets a message from a channel at a timestamp', function (done) {
      var channelId = 'another-channel';
      var ts = 1234567.9816;
      bot.getMessageInfo(channelId, ts, function (messageResponse) {
        bot.web.channels.history.calledWithMatch(channelId, { latest: ts, count: 1, inclusive: true });
        messageResponse.should.be.an('object').which.has.a.property('text');
        done();
      });
    });
  });

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

  describe('onReacji', function () {
    var messageReactionEvent = {
      type: slack.RTM_EVENTS.REACTION_ADDED,
      reaction: 'wat',
      item: {
        type: 'message',
        channel: 'reacted-channel',
        ts: 234567.123
      }
    };
    var fileReactionEvent = {
      type: slack.RTM_EVENTS.REACTION_ADDED,
      reaction: 'dash',
      item: {
        type: 'file',
        file: 'some-file-id'
      }
    };

    beforeEach(function () {
      transport = new MockTransport({ rtm: [messageReactionEvent, fileReactionEvent] });
      bot = new Slackbot(transport, env);
    });

    it('registers a callback on reacji events', function () {
      bot.onReacji('whoa', function () {});
      bot.rtm.on.calledWith(slack.RTM_EVENTS.REACTION_ADDED);
    });

    it('ignores file comment reactions for now', function (done) {
      var otherReactionEvent = {
        type: slack.RTM_EVENTS.REACTION_ADDED,
        reaction: 'boom',
        item: {
          type: 'file-comment'
        }
      };
      transport = new MockTransport({ rtm: [otherReactionEvent, messageReactionEvent] });
      bot = new Slackbot(transport, env);
      bot.onReacji('boom', function (event) {
        event.should.not.exist;
      });
      bot.onReacji('wat', function (event) {
        event.should.be.an('object').which.property('reaction').equals('wat');
        event.should.have.property('message');
        done();
      });
      bot.connect();
    });

    it('allows multiple reacji in an array', function (done) {
      transport = new MockTransport({
        rtm: [
          messageReactionEvent,
          fileReactionEvent,
          Object.assign({}, messageReactionEvent, {
            reaction: 'wat_inverted'
          })
        ]
      });
      bot = new Slackbot(transport, env);
      var count = 0;
      bot.onReacji(['wat', 'wat_inverted'], function (event) {
        count++;
        if (count === 2) {
          bot.web.channels.history.should.have.been.calledOnce;
          done();
        }
      });
      bot.connect();
    });

    it('ignores reactions different than the requested reaction', function (done) {
      var otherReactionEvent = {
        type: slack.RTM_EVENTS.REACTION_ADDED,
        reaction: 'no_good',
        item: {
          type: 'message',
          channel: 'wrong-channel',
          ts: 'wrong-ts'
        }
      };
      transport = new MockTransport({ rtm: [otherReactionEvent, messageReactionEvent] });
      bot = new Slackbot(transport, env);
      bot.onReacji('wat', function (event) {
        event.should.be.an('object').which.property('reaction').not.equals('no_good');
        event.should.have.property('item').which.property('channel').not.equals('wrong-channel');
        done();
      });
      bot.connect();
    });

    it('gets message info to populate full message text', function (done) {
      bot.onReacji('wat', function (event) {
        bot.web.channels.history.should.have.been.called;
        event.should.be.an('object').which.property('reaction').equals('wat');
        event.should.have.property('message')
          .which.property('text')
          .equals(MockTransport.fixtures.channels.history.messages[0].text);
        done();
      });
      bot.connect();
    });

    it('provides the file_id for a file at the expected spot', function (done) {
      bot.onReacji('dash', function (event) {
        event.should.have.property('file_id');
        event.should.have.property('item').which.property('type').equals('file');
        event.file_id.should.equal(event.item.file);
        done();
      });
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
