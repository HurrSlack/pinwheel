require("dotenv").config();
const camelspace = require("camelspace");
const createApp = require("./app");

async function main() {
  const [slack, twitter, reacji] = camelspace.for("", [
    "slack",
    "twitter",
    "reacji",
  ]);
  const app = await createApp({ slack, twitter, reacji }, process.env);
  // Start your app
  await app.start(process.env.PORT || 3000);

  console.log("⚡️ Bolt app is running!");
}

main();
