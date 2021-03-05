require("dotenv").config();
const { App, LogLevel } = require("@slack/bolt");

// Initializes your app with your bot token and signing secret
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  logLevel: LogLevel.DEBUG,
});

app.event("reaction_added", async (stuff) =>
  console.log("reaction_added", stuff)
);
(async () => {
  // Start your app
  await app.start(process.env.PORT || 3000);

  console.log("⚡️ Bolt app is running!");
})();
