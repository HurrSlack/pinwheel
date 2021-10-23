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
  const app = await createApp(
    camelspace.of(["slack", "twitter", "pinwheel", "db"]),
    process.env
  );
  // Start your app
  const server = await app.start(process.env.PORT || 3000);

  console.log("📌 Pinwheel app is running");
  return server;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
