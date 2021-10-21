const { BasePoastHandler, decodeSlackEntities } = require("./base-handler");

class MessageHandler extends BasePoastHandler {
  /**
   * Return canonical object that database connectors can use to locate the
   * poast in the database by a unique ID.
   */
  getPoastDescriptor() {
    const { item } = this.payload;
    return {
      type: "message",
      slack_id: item.ts,
    };
  }
  async _getMessageWithReactions() {
    const { item } = this.payload;
    return this.client.reactions.get({
      channel: item.channel,
      timestamp: item.ts,
      full: true,
    });
  }
  async getPinReactions() {
    const { globalConfig } = this;
    const { reactions } = await this._getMessageWithReactions();
    return (
      reactions &&
      reactions.find(
        (reaction) =>
          reaction.name === globalConfig.pinwheel.pinReacji &&
          reaction.count > 0
      )
    );
  }
  async sendTweet(twitterClient) {
    const { payload } = this;
    const { item } = payload;

    // Use the reactions API to get the full message text, since the
    // conversations.history API is wordier.
    const { message } = await this._getMessageWithReactions();
    const text = decodeSlackEntities(message.text);
    if (text.length > 280) {
      throw new Error(
        `Message "${text}" is ${text.length} characters, which is too long for a text tweet.`
      );
    }

    const tweet = await twitterClient.tweets.statusesUpdate({
      status: text,
    });
    this.logger.info(
      `Tweeted message ${item.ts}, "${text}".`,
      `https://twitter.com/twitter/status/${tweet.id_str}`
    );
    return tweet.id_str;
  }
}

module.exports = MessageHandler;
