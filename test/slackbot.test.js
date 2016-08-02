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
      var next = sinon.spy(() => done());
      var wrappedNext = bot.includeChannel(next);
      var response = {};
      wrappedNext(response);
      next.calledOnce.should.be.true;
      next.getCall(0).args.should.eql([response]);
    });
    it('includes the channel if channel_id is found', function (done) {
      transport = new MockTransport({
        webChannelsInfo: function (channelId, next) {
          var err = false;
          next(err, 'channel-response');
        }
      });
      bot = new Slackbot(transport, env);
      var next = sinon.spy(() => done());
      var wrappedNext = bot.includeChannel(next);
      var response = {channel_id: 'channel-id'};
      wrappedNext(response);
      bot.web.channels.info.calledOnce.should.be.true;
      bot.web.channels.info.getCall(0).args[0].should.equal('channel-id');
    });
  });

  describe('getFileInfo', function () {
    it('gets a file by id', function (done) {
      var id = 'test-file';
      var next = sinon.spy(() => done());
      var resultFile = 'result-file';
      transport = new MockTransport({
        webFilesInfo: function (id, next) {
          var err = false;
          var res = { file: resultFile };
          next(err, res);
        }
      });
      bot = new Slackbot(transport, env);

      bot.getFileInfo(id, next);
      bot.web.files.info.called.should.be.true;
      bot.web.files.info.getCall(0).args[0].should.equal(id);
      next.calledOnce.should.be.true;
      next.getCall(0).args[0].should.equal(resultFile);
    });
  });

  describe('onPinAdded', function () {
    it('registers a callback on rtm', function (done) {
      transport = new MockTransport({
        webChannelsInfo: function (channelId, next) {
          var err = false;
          next(err, 'channel-response');
        },
        rtmOn: function (evt, next) {
          var response = { channel_id: 'channel-id' };
          next(response);
        }
      });
      bot = new Slackbot(transport, env);
      var next = sinon.spy(() => done());
      bot.onPinAdded(next);
      bot.rtm.on.calledOnce.should.be.true;
      bot.rtm.on.getCall(0).args[0].should.equal(slack.RTM_EVENTS.PIN_ADDED);
      next.calledOnce.should.be.true;
      next.getCall(0).args.should.eql([{ channel_id: 'channel-id' }, 'channel-response']);
    });
  });

  describe('connect', function () {
    it('authenticates and starts the rtm client', function (done) {
      transport = new MockTransport({
        rtmOn: function (evt, next) {
          next();
        }
      });
      bot = new Slackbot(transport, env);
      bot.connect(done);
      bot.rtm.on.calledOnce.should.be.true;
      bot.rtm.on.getCall(0).args.should.eql([
        slack.CLIENT_EVENTS.RTM.AUTHENTICATED,
        done
      ]);
      bot.rtm.start.calledOnce.should.be.true;
    });
  });
});
