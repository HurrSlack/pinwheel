/* global describe, it, beforeEach */
var chai = require('chai');
// var sinon = require('sinon');
// var helpers = require('../helpers');

chai.should(); // extends native prototypes to provide fluent getters, caution

var Pin = require('../pin');
describe('Pin', function () {
  describe('posting strategies include', function () {
    var pin;
    beforeEach(function () {
      pin = new Pin(
        /* env: */ { vars: {} },
        /* slackbot:  */ {
          getFileInfo (id, cb) {
            cb(id);
          }
        },
        /* tweeter */ {
          postTweet (text) {
            console.log('postTweet called with', text);
          },
          postTweetAndImage (data, title) {
            console.log('postTweetAndImage called with', data, title);
          }
        },
        /* cache */ {
          get: function () {},
          set: function () {},
          drop: function () {},
          stage: function () {}
        }
      );
    });
    describe('`message`, which', function () {
      it('dies like a warrior if the passed item has no text property', function () {
        pin.post.bind(pin, {}).should.throw(/no strategy/i);
      });
    });
  });
});
