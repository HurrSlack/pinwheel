var Twit = require('twit');
var path = require('path');
var slackbot = require('node-slackbot');

require('dotenv').config({
	path: path.resolve('./env_variables'),
	silent: true
});

var T = new Twit({
	consumer_key: process.env.TWITTER_CONSUMER_KEY,
	consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
	access_token: process.env.TWITTER_ACCESS_TOKEN,
	access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
});

var bot = new slackbot(process.env.SLACK_TOKEN);

var Canvas = require('canvas')
 

function postTweet(text) {
	T.post('statuses/update', { status: text }, (err, data, res) => {
			if (err) {
				console.error(err);
			} else {
				console.log('twote "' + text + '", received: ', data);
			}
	});
}

function postTweetAndImage(image, trimmedText){
	console.log(image);
	T.post('media/upload', { media_data: image }, function (err, data, response) {
	  var mediaIdStr = data.media_id_string
	  var meta_params = { media_id: mediaIdStr, alt_text: { text: trimmedText } }

	  T.post('media/metadata/create', meta_params, function (err, data, response) {
	    if (!err) {
			var params = { status: trimmedText, media_ids: [mediaIdStr] }

	      T.post('statuses/update', params, function (err, data, response) {
	        console.log(data)
	      })
	    }
	  })
	})
}

function createSlackImage(canvas, text) {
    var Image = Canvas.Image
    , ctx = canvas.getContext('2d');

  	ctx.font = '24px Slack-Lato';
	var image = ctx.fillText(text, 20, 25);
}

bot.use(
	function(message, cb) {
	if ('pin_added' == message.type) {
		console.log('received pin', JSON.stringify(message.item, null, 2));
		var text = message.item.message && message.item.message.text;
		if (text && text.length <= 140) {
			postTweet(text);
		} else if (text && text.length > 140) {
			console.log("generating tweet for text > 140 characters");
			var trimmedText = text.substring(0,110) + "…";
			var canvas = new Canvas(880, 400);
			createSlackImage(canvas, text);
			var imageData =  canvas.toDataURL('image/png'); 
			imageData = imageData.split(",")[1];
			postTweetAndImage(imageData, trimmedText);
		}
	}
});



bot.connect();
console.log('listening...')
