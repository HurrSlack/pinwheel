var https = require('https');
var url = require('url');
var assign = require('lodash.assign');
var concat = require('concat-stream');
var helpers = require('./helpers');
var createFakeScreenshot = require('./create-fake-screenshot');

var log = helpers.logger('Pin');

var strategies = {
  message: function postText (item) {
    var message = item && item.message;
    if (!message || !message.text || (typeof message.text !== 'string')) {
      throw Error('Message strategy cannot post passed object because it does not have a `message` ' +
                  'property with a `text` string:\n\n' + JSON.stringify(item, null, 2));
    }
    if (helpers.age(message.ts) > helpers.age.DAY) {
      throw new Error('The pinned message cannot be twote because it is older than one day.');
    }
    log('asked to post text, trying cache');
    var twote = this._cache.get(message);
    log('got item from cache', twote);
    if (twote) {
      return log('already twote', message);
    }
    log('approved to tweet', message);
    var text = message.text;
    if (text.length <= 140) {
      log('length <= 140, posting the following as text: ' + text);
      this._tweeter.postTweet(text);
      this._cache.stage(message);
    } else {
      log('generating tweet for text > 140 characters');
      var trimmedText = text.substring(0, 110) + '…';
      createFakeScreenshot(
        message.permalink,
        helpers.handleError(function (image) {
          this._tweeter.postTweetAndImage(image, trimmedText);
          this._cache.stage(message);
        }.bind(this))
      );
    }
  },
  file: function postFile (item) {
    var self = this;
    var twote = this._cache.get(item);
    if (twote) {
      return log('already twote', item);
    }
    this._slackbot.getFileInfo(item.file_id, function onFileInfo (info) {
      if (helpers.age(info.timestamp) > helpers.age.ONE_DAY) {
        throw new Error('The pinned file cannot be twote because it is older than one day.');
      }
      getImage(info.thumb_960 || info.thumb_480 || info.url_private);
      function getImage (uri) {
        var options = assign(url.parse(uri), {
          headers: {
            'Authorization': 'Bearer ' + self._env.vars.SLACK_TOKEN
          }
        });
        log('requesting file: ', options);
        https.get(options, function streamResponse (res) {
          if (res.statusCode >= 300 && res.statusCode <= 400) {
            log('redirected to', res.headers.location);
            return getImage(res.headers.location);
          }
          if (res.statusCode !== 200) {
            throw Error(
              'Status code ' + res.statusCode + ' returned for file ' + url
            );
          }
          res.setEncoding('base64');
          res.pipe(concat(function sendImageData (data) {
            log('sending image data to tweeter');
            self._tweeter.postTweetAndImage(data, info.title);
            self._cache.stage(item);
          }));
        });
      }
    });
  }
};

function Pin (env, slackbot, tweeter, cache) {
  this._env = env;
  this._slackbot = slackbot;
  this._tweeter = tweeter;
  this._cache = cache;
}

Pin.prototype.post = function (pinned) {
  var post = strategies[pinned && pinned.item && pinned.item.type];
  if (!post) {
    throw Error('No strategy to handle this type of pin: ' + JSON.stringify(pinned));
  }
  post.call(this, pinned);
};

module.exports = Pin;
