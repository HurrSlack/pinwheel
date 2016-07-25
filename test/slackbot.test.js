/* global describe, it, beforeEach */
var nock = require('nock');
var Slackbot = require('../slackbot');
var helpers = require('../helpers');

var slackApiOrigin = 'https://slack.com:443';
var env = helpers.getEnv({
  env: {
    SLACK_TOKEN: 'test-token',
    NODE_ENV: 'development'
  }
});

describe('the slackbot factory', function () {
  var bot;
  beforeEach(function () {
    bot = Slackbot(env);
  });
  it('returns a slackbot API interface', function () {
    bot.should.be.an('object');
    bot.should.respondTo('connect');
    bot.should.respondTo('onPinAdded');
    bot.should.respondTo('getFileInfo');
  });
  it('gets a file by id', function (done) {
    this.timeout(10000);
    nock(slackApiOrigin)
      .log(console.log)
      .post('/api/files.info', /test\-file/)
      .reply(200, { ok: true, file: { foo: 'bar' } });
    bot.getFileInfo('test-file', function (file) {
      nock.isDone().should.be.true;
      file.should.have.property('foo').equals('bar');
      done();
    });
  });
});
