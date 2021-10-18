/**
 * @typedef {import('@slack/bolt').AllMiddlewareArgs} AllMiddlewareArgs
 * @typedef {import('@slack/bolt').SlackEventMiddlewareArgs} SlackEventMiddlewareArgs
 * @typedef {AllMiddlewareArgs & SlackEventMiddlewareArgs} SlackEventData
 * @typedef {import('./poast-handlers/base-handler')} PoastHandler
 */
/**
 * @typedef {Object} PoastingContext
 * @property {PoastHandler} poastHandler
 *
 * @typedef {Object} PoastingContextHaver
 * @property {PoastingContext} context
 *
 * @typedef {SlackEventData & PoastingContextHaver} PoastArgs
 */
const { App: SlackApp, LogLevel } = require("@slack/bolt");
const { TwitterClient } = require("twitter-api-client");
const createDbConnector = require("./db-connector");

module.exports = async function createApp(config, env = process.env) {
  const isProd = env.NODE_ENV === "production";

  // Initializes your app with your bot token and signing secret
  const slack = new SlackApp({
    ...config.slack,
    logLevel: isProd ? LogLevel.INFO : LogLevel.DEBUG,
  });
  
  slack.error((e) =>
    console.error("Unhandled exception!", require("util").inspect(e))
  );

  const dbConnector = createDbConnector(config.db);
  slack.dbConnector = dbConnector;

  /**
   * Stops if it's not a 📌 (or whatever's configured)
   * @param {SlackEventData} data
   */
  async function onlyPinReacts({ payload, next }) {
    if (payload.reaction === config.pinwheel.pinReacji) {
      await next();
    }
  }

  /**
   * @param {PoastArgs} data
   */
  async function withPoastHandler({ context, payload, client, logger, next }) {
    let PoastHandler;
    try {
      PoastHandler = require(`./poast-handlers/poast-${payload.item.type}`);
    } catch (e) {
      logger.error(
        `Failed to find a way to make a poast out of unknown type "${payload.item.type}". ${e.message}`
      );
      return;
    }
    context.poastHandler = new PoastHandler(config, payload, client, logger);
    await next();
  }

  let cachedDenyMap;
  /**
   *
   * @param {SlackEventData} data
   * @returns {Set} list of channel IDs to avoid
   */
  async function getDenyList({ client, logger }) {
    if (!cachedDenyMap) {
      logger.info("Populating channel deny list on first request");
      const denyChannelNameList = (config.pinwheel.denyChannels || "").split(
        ","
      );
      logger.debug(
        `${denyChannelNameList.length} channel name(s) to deny: ${denyChannelNameList}`
      );
      const denyChannelNames = new Set(denyChannelNameList);
      const denyChannelMap = new Map();
      const deny = (channel) => {
        logger.debug(`Deny channel ${channel.name} has id ${channel.id}`);
        denyChannelMap.set(channel.id, channel);
      };
      if (denyChannelNames.size > 0) {
        const channelList = await client.conversations.list({
          exclude_archived: true,
        });
        searchingChannels: for (const channel of channelList.channels) {
          if (denyChannelNames.has(channel.name)) {
            deny(channel);
          } else {
            for (const previousName of channel.previous_names) {
              if (denyChannelNames.has(previousName)) {
                logger.debug(
                  `Deny channel ${previousName} is now named ${channel.name}`
                );
                deny(channel);
                continue searchingChannels;
              }
            }
          }
        }
      }
      cachedDenyMap = denyChannelMap;
    }
    return cachedDenyMap;
  }

  /**
   * @param {PoastArgs} data
   */
  async function gtfoDeniedChannel(channel, { client, logger, say }) {
    const denied = await getDenyList({ client, logger });
    const deniedChannel = denied.get(channel);
    if (deniedChannel) {
      await say(
        `_i'm not even supposed to be in #${deniedChannel.name} what am i doing here_`
      );
      await client.conversations.leave({ channel });
      return true;
    }
    return false;
  }

  /**
   * @param {PoastArgs} data
   */
  async function supposedToBeHere(data) {
    if (await gtfoDeniedChannel(data.payload.item.channel, data)) {
      await data.next();
    }
  }

  /**
   *
   * @param {PoastArgs} data
   */
  async function joinParty({ client, logger }) {
    if (config.pinwheel.autojoinChannels) {
      const toAutoJoin = config.pinwheel.autojoinChannels.split(",");
      if (toAutoJoin.length > 0) {
        logger.info(
          `Autojoining channel(s) ${toAutoJoin
            .map((name) => "#" + name)
            .join(", ")}`
        );
        const autoJoinSet = new Set(toAutoJoin);
        const channelList = await client.conversations.list({
          types: "public_channel",
          exclude_archived: true,
        });
        if (!channelList.ok) {
          logger.error("Couldn't fetch channels!", channelList.error);
          return;
        }
        for (const channel of channelList.channels) {
          if (
            autoJoinSet.has(channel.name) ||
            channel.previous_names.any((name) => autoJoinSet.has(name))
          ) {
            await client.conversations.join({ channel: channel.id });
            logger.info(`Autojoined channel ${channel.name}`);
          }
        }
      }
    }
  }

  slack.event("hello", async function regulatorsMountUp({ client, logger }) {
    const me = await client.auth.test();
    logger.info("it's-a me, ", me);
    await joinParty({ client, logger });
  });

  slack.event("member_joined_channel", async (data) => {
    const { payload, context } = data;
    if (payload.user === context.botUserId) {
      await gtfoDeniedChannel(data.payload.channel, data);
    }
  });

  slack.event(
    "reaction_added",
    onlyPinReacts,
    supposedToBeHere,
    withPoastHandler,
    async function doTweetMessageText({ context, logger }) {
      const { poastHandler } = context;
      await dbConnector.connect();
      const poast = await dbConnector.load(poastHandler.getPoastDescriptor());
      if (poast.tweet_id) {
        logger.warn(
          `Poast "${poast.slack_id}" was already tweeted! https://twitter.com/twitter/status/${poast.tweet_id}`
        );
      } else if (poast.forbidden) {
        logger.warn(
          `Poast ${poast.slack_id} cannot be tweeted, is poast forbidden`
        );
      } else {
        let tweetId;
        try {
          tweetId = await poastHandler.sendTweet(
            new TwitterClient(config.twitter)
          );
        } catch (e) {
          logger.error(
            new Error(
              `Could not tweet message ${JSON.stringify(poast)}: ${
                e.message || require("util").inspect(e)
              }`
            ).stack
          );
        }
        if (tweetId) {
          poast.tweet_id = tweetId;
          try {
            await dbConnector.save(poast);
            logger.info("Poast stored", poast);
          } catch (e) {
            logger.error(
              `Could not store tweet ${poast.tweet_id} for poast ${poast.slack_id}: ${e.stack}`
            );
          }
        }
        await dbConnector.disconnect();
      }
    }
  );

  slack.event(
    "reaction_removed",
    onlyPinReacts,
    withPoastHandler,
    async function doRemvoePoast({ context, logger }) {
      const { poastHandler } = context;
      const reactions = await poastHandler.getPinReactions();
      if (reactions) {
        logger.info("Still has pin reacts left. Will not untweet yet.");
        return;
      }
      logger.info(
        `After latest removal: ${JSON.stringify(
          poastHandler.getPoastDescriptor()
        )} has 0 pin reacts. Should untweet.`
      );
      await dbConnector.connect();
      const poast = await dbConnector.load(poastHandler.getPoastDescriptor());
      if (!poast.tweet_id) {
        logger.warn(
          `Poast "${poast.slack_id}" does not have a tweet associated. It must have not successfully twote when pinned.`
        );
        return;
      }
      logger.info(
        "Running twitter.tweets.statusesDestroyById with",
        poast.tweet_id
      );
      const twitter = new TwitterClient(config.twitter);
      await twitter.tweets.statusesDestroyById({ id: poast.tweet_id });
      logger.info("Untwote", poast);
      delete poast.tweet_id;
      await dbConnector.save(poast);
      await dbConnector.disconnect();
    }
  );

  return slack;
};
