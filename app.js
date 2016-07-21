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
var CanvasTextWrapper = require('canvas-text-wrapper').CanvasTextWrapper;

// tests
var text = "You'd take the clothes off my back and I'd let you You'd steal the food right out my mouth and I'd watch you eat it I still don’t know why, why our love is so much, ohh (Thanks for warnin' me, thanks for warnin' me) You curse my name, in spite, to put me to shame Hang my laundry in the streets, dirty or clean, give it up for fame But I still don't know why, why I love it so much (Thanks for warnin' me, thanks for warnin' me)";
 
var trimmedText = text.substring(0,110) + "…";
var canvas = new Canvas(880, 400);
createSlackImage(canvas, text);

var imageData =  canvas.toDataURL('image/png'); 

var fs = require('fs')
  , out = fs.createWriteStream(__dirname + '/text.png')
  , stream = canvas.pngStream();

stream.on('data', function(chunk){
  out.write(chunk);
});

stream.on('end', function(){
  console.log('saved png');
});



// end tests


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

	var options = { 
        font: "24px Arial, sans-serif",
        lineHeight: 1,
        textAlign: "left",
        verticalAlign: "top",
        paddingX: 0,
        paddingY: 0,
        fitParent: false,
        lineBreak: "auto",
        sizeToFill: false,
        allowNewLine: true,
        justifyLines: false,
        strokeText: false,
        renderHDPI: true,
        textDecoration: "none"
    }
	
	CanvasTextWrapper(canvas, text, options);

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
