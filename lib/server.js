async function main() {
  const camelspace = require("camelspace");
  const createApp = require("./app");

  try {
    const dotenv = require("dotenv");
    const result = await dotenv.config({
      debug: process.env.NODE_ENV !== "production",
    });
    if (result && result.error) {
      throw result.error;
    }
  } catch (e) {
    console.warn(
      "dotenv could not get env vars from '.env', will proceed using only already-assigned environment variables"
    );
    if (e.code !== "ENOENT") {
      console.warn(e);
    }
  }
  const appSettings = camelspace.of(["slack", "twitter", "pinwheel", "db"]);
  appSettings.slack.customRoutes = [
    {
      path: "/health-check",
      method: ["GET"],
      handler: (req, res) => {
        res.writeHead(200);
        res.end("Health check information displayed here!");
      },
    },
  ];
  const app = await createApp(appSettings, process.env);

  const port = process.env.PORT || 3000;
  // Start your app
  const server = await app.start(port);

  console.log(`📌 Pinwheel app is running at ${port}`);
  return server;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
