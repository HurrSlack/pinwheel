var Twit = require('twit');
var path = require('path');
require('dotenv').config({
	path: path.resolve('./env_variables')
});

var T = new Twit({
	consumer_key: process.env.TWITTER_CONSUMER_KEY,
	consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
	access_token: process.env.TWITTER_ACCESS_TOKEN,
	access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
});

var SLACK_TOKEN = process.env.SLACK_TOKEN;

var slackbot = require('node-slackbot');
var bot = new slackbot(SLACK_TOKEN);


bot.use(
	function(message, cb) {
	if ('pin_added' == message.type) {
		console.log('received pin', JSON.stringify(message.item, null, 2));
		var text = message.item.message && message.item.message.text;
		if (text) {
			T.post('statuses/update', { status: text }, (err, data, res) => {
					if (err) {
						console.error(err);
					} else {
						console.log('twote "' + text + '", received: ', data,);
					}
			});
		}
	}
});


bot.connect();
