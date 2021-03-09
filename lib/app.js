require("dotenv").config();
const { App, LogLevel } = require("@slack/bolt");

// Initializes your app with your bot token and signing secret
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  logLevel: LogLevel.DEBUG,
});

app.event("reaction_added", async ({ payload, client }) => {
  if (payload.reaction !== "pushpin") return;
  console.log("pushpinned", { payload });
  const convos = await client.conversations.history({
    channel: payload.item.channel,
    latest: payload.item.ts,
    inclusive: true,
    limit: 1,
  });
  if (convos.messages && convos.messages.length === 1) {
    console.log('Pinned: "%s"', convos.messages[0].text);
  } else {
    throw new Error("message not found!");
  }
});
(async () => {
  // Start your app
  await app.start(process.env.PORT || 3000);

  console.log("⚡️ Bolt app is running!");
})();
