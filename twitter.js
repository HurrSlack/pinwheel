var Twit = require('twit');
var helpers = require('./helpers');

module.exports = function Twitter (env) {
  var client = new Twit({
    consumer_key: env.vars.TWITTER_CONSUMER_KEY,
    consumer_secret: env.vars.TWITTER_CONSUMER_SECRET,
    access_token: env.vars.TWITTER_ACCESS_TOKEN,
    access_token_secret: env.vars.TWITTER_ACCESS_TOKEN_SECRET
  });

  function postTweet (text) {
    client.post('statuses/update', { status: text },
      helpers.handleError(function logTwote (data) {
        console.log('twote "' + text + '", received: ', data);
      })
    );
  }

  function postTweetAndImage (image, trimmedText) {
    client.post('media/upload', { media_data: image },
      helpers.handleError(function makeMediaMetadata (data, response) {
        var mediaIdStr = data.media_id_string;
        var meta = {
          media_id: mediaIdStr,
          alt_text: {
            text: trimmedText
          }
        };

        client.post('media/metadata/create', meta,
          helpers.handleError(function postMediaStatus (data) {
            var params = {
              status: trimmedText,
              media_ids: [mediaIdStr]
            };

            client.post('statuses/update', params,
              helpers.handleError(function logMediaTwote (data) {
                console.log('twote media', data);
              })
            );
          })
         );
      })
    );
  }
  return {
    postTweet: postTweet,
    postTweetAndImage: postTweetAndImage
  };
};

