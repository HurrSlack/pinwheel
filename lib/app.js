const { App, LogLevel } = require("@slack/bolt");
const Directory = require("./directory");
const {
  getUserList,
  getChannelList,
  getMessage,
  getPinReact,
  seconds,
} = require("./helpers");

module.exports = async function createApp({ token, signingSecret }) {
  const isProd = process.env.NODE_ENV === "production";

  // Initializes your app with your bot token and signing secret
  const app = new App({
    token,
    signingSecret,
    logLevel: isProd ? LogLevel.INFO : LogLevel.DEBUG,
  });

  const users = new Directory({
    type: "user",
    retrieve: getUserList,
    client: app.client,
    token,
  });

  const channels = new Directory({
    type: "channel",
    retrieve: getChannelList,
    client: app.client,
    token,
  });

  app.event("reaction_added", async ({ payload, client }) => {
    if (payload.reaction !== "pushpin") return;
    const message = await getMessage(client, payload.item);
    const pinReact = getPinReact(message);
    if (pinReact) {
      console.log(
        '@%s pinned a message from @%s in #%s: "%s". Time to tweet it!',
        await users.get(payload.user, "name"),
        await users.get(payload.item_user, "name"),
        await channels.get(payload.item.channel, "name"),
        message.text
      );
      // TODO: hook up the tweets!
    }
  });

  app.event("reaction_removed", async ({ payload, client }) => {
    if (payload.reaction !== "pushpin") return;
    await seconds(5);
    const message = await getMessage(client, payload.item);
    if (!getPinReact(message)) {
      console.log('Not currently pinned: "%s". Should untweet.', message.text);
      // TODO: hook up the removal of tweets. requires persistence layer
    }
  });

  return app;
};
