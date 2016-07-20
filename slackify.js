var path = require('path');
require('dotenv').config({
    path: path.resolve('./env_variables')
});

var SLACK_TOKEN = process.env.SLACK_TOKEN;
var TWITTER_TOKEN  = process.env.TWITTER_TOKEN;

var slackbot = require('node-slackbot');
var bot = new slackbot(SLACK_TOKEN);


bot.use(function (message, cb) {
    if ('message' == message.type && message.text) {

      
});

bot.connect();