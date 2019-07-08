/* global describe, it, beforeEach */
var chai = require('chai');
// var sinon = require('sinon');
// var helpers = require('../helpers');

chai.should(); // extends native prototypes to provide fluent getters, caution

var Pin = require('../pin');
describe('Pin', function () {
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
        get: function () { },
        set: function () { },
        drop: function () { },
        stage: function () { }
      }
    );
  });
  describe('#post', function () {
    function pinningItem (item) {
      return pin.post.bind(pin, item);
    }
    it('calls BS if the argument is falsy', function () {
      pinningItem().should.throw(/no strategy/i);
    });
    it('dies like a warrior if there is no item', function () {
      pinningItem({}).should.throw(/no strategy/i);
    });
    it('cries to the heavens if the item has no type', function () {
      pinningItem({ item: {} }).should.throw(/no strategy/i);
    });
    it('screams bloody murder if the type is unrecognized', function () {
      pinningItem({ item: { type: 'bad' } }).should.throw(/no strategy/i);
    });
    describe('strategies', function () {
      const now = new Date();
      const earlier = new Date();
      const twoDays = 60 * 60 * 24 * 2;
      const earlierTs = earlier.getTime() / 1000 - twoDays;
      describe.only('`message`', function () {
        it('will not post a message pinned more than a day after being posted', function () {
          pinningItem({ item: { type: 'message' }, message: { text: 'glorp', ts: earlierTs } }).should.throw(/older than one day/);
        });
        it('objects strenuously to an item without a message property', function () {
          pinningItem({ item: { type: 'message', ts: now } }).should.throw(/does not have a\W+message/);
        });
      });
    });
  });
});
