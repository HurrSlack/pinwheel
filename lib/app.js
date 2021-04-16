const { App: SlackApp, LogLevel } = require("@slack/bolt");
const { TwitterClient } = require("twitter-api-client");
const Directory = require("./directory");
const { getUserList, getChannelList, getMessage } = require("./helpers");

module.exports = async function createApp(config) {
  const isProd = process.env.NODE_ENV === "production";

  // Initializes your app with your bot token and signing secret
  const slack = new SlackApp({
    ...config.slack,
    logLevel: isProd ? LogLevel.INFO : LogLevel.DEBUG,
  });

  const users = new Directory({
    ...config.slack,
    type: "user",
    retrieve: getUserList,
    client: slack.client,
  });

  const channels = new Directory({
    ...config.slack,
    type: "channel",
    retrieve: getChannelList,
    client: slack.client,
  });

  /**
   * Middlewares
   */

  async function onlyPinReacts({ context, payload, next }) {
    if (payload.reaction === config.reacji.toTriggerTweet) {
      context.pinned = {};
      await next();
    }
  }

  async function onlyPublicChannels({ context, payload, logger, next }) {
    try {
      context.pinned.channelName = await channels.get(
        payload.item.channel,
        "name"
      );
      await next();
    } catch (e) {
      logger.info(`Pin was not in a recognized channel: ${e.message}`);
    }
  }

  async function withMessageContext({ client, context, payload, next }) {
    try {
      const [message, pinner, quotedUser] = await Promise.all([
        getMessage(client, payload.item),
        users.get(payload.user, "name"),
        users.get(payload.item_user, "name"),
      ]);

      Object.assign(context.pinned, {
        message,
        pinner,
        quotedUser,
      });

      if (message.reactions) {
        context.pinned.react = message.reactions.find(
          (reaction) =>
            reaction.name === config.reacji.toTriggerTweet && reaction.count > 0
        );
      }
      await next();
    } catch (e) {
      console.error("Could not get metadata for this event", payload, e);
    }
  }

  async function stillPinned({ context, logger, next }) {
    const { pinned } = context;
    const pinNotice = `@${pinned.pinner} pinned a message from @${pinned.quotedUser} in #${pinned.channelName}: "${pinned.message.text}"`;
    if (pinned.react) {
      logger.info(pinNotice);
      await next();
    } else {
      logger.info(
        `${pinNotice}, but by the time we checked, there was no pin reaction. Perhaps it got removed. Anyway, we won't tweet it.`
      );
    }
  }

  async function tweetableLength({ context, logger, next }) {
    const { text } = context.pinned.message;
    if (text.length > 280) {
      logger.warn(
        `Message "${text}" is ${text.length} characters, which is too long for a text tweet.`
      );
    } else {
      await next();
    }
  }

  async function withTwitter({ context, next }) {
    context.twitter = new TwitterClient(config.twitter);
    await next();
  }

  slack.error((e) =>
    console.error("Unhandled exception!", require("util").inspect(e))
  );

  slack.event(
    "reaction_added",
    onlyPinReacts,
    onlyPublicChannels,
    withMessageContext,
    stillPinned,
    tweetableLength,
    withTwitter,
    async function tweetMessageText({ context, logger }) {
      const { pinned, twitter } = context;
      try {
        await twitter.tweets.statusesUpdate({
          status: pinned.message.text,
        });
      } catch (e) {
        logger.error("Failed tweeting!", e);
      }
    }
  );

  slack.event(
    "reaction_removed",
    onlyPinReacts,
    onlyPublicChannels,
    withMessageContext,
    withTwitter,
    async ({ context, logger }) => {
      const { pinned } = context;
      if (!pinned.react) {
        logger.info(
          `Not currently pinned: "${pinned.message.text}". Should untweet.`
        );
        // TODO: hook up the removal of tweets. requires persistence layer
      }
    }
  );

  return slack;
};
