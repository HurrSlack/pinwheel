jest.mock("twitter-api-client", () => ({
  TwitterClient: jest.fn(function MockTwitterClient() {
    this.tweets = {
      statusesUpdate: jest.fn().mockImplementation(async ({ status }) => {
        if (status.includes("private")) {
          throw new Error(`SHOULDNTA TWOTE THIS! "${status}"`);
        }
        return { id_str: "123tweeet" };
      }),
      statusesDestroyById: jest.fn(),
    };
  }),
}));
jest.mock("@slack/bolt", () => ({
  App: jest.fn(function MockSlackApp() {
    this.error = jest.fn((handler) => {
      this._errorHandler = handler;
    });
    this._registeredHandlers = {};
    this.event = jest.fn((eventName, ...middleware) => {
      this._registeredHandlers[eventName] = (arg) =>
        new Promise((resolve, reject) => {
          let lastCalledMiddlewareIndex = -1;

          let intermediateValue;
          async function invokeMiddleware(toCallMiddlewareIndex) {
            if (lastCalledMiddlewareIndex >= toCallMiddlewareIndex) {
              throw Error("next() called multiple times");
            }

            if (toCallMiddlewareIndex < middleware.length) {
              lastCalledMiddlewareIndex = toCallMiddlewareIndex;
              let nextCalled = false;
              intermediateValue = await middleware[toCallMiddlewareIndex]({
                next: () => {
                  nextCalled = true;
                  return invokeMiddleware(toCallMiddlewareIndex + 1);
                },
                ...arg,
              });
              if (!nextCalled) {
                resolve(intermediateValue);
              } else return intermediateValue;
            }

            resolve();
          }

          invokeMiddleware(0).catch(reject);
        });
    });
    this.client = {
      auth: {
        test: jest.fn().mockResolvedValue({
          botId: "bot-id",
          botUserId: "bot-user-id",
        }),
      },
      reactions: {
        get: jest.fn(),
      },
      conversations: {
        leave: jest.fn(),
        list: jest.fn().mockResolvedValue({
          channels: [
            {
              id: "channel1",
              name: "channelone",
              previous_names: ["old_channelone"],
            },
            {
              id: "channel2",
              name: "channeltwo",
              previous_names: ["deniedchanneltwo"],
            },
            {
              id: "channel3",
              name: "channelthree",
              previous_names: [],
            },
            {
              id: "deniedchannel1",
              name: "deniedchannelone",
              previous_names: [],
            },
          ],
        }),
      },
      users: {
        list: jest.fn(),
      },
    };
  }),
  LogLevel: {
    DEBUG: 5,
    INFO: 4,
  },
}));
jest.spyOn(global.console, "error").mockImplementation(() => {});

const { App: SlackApp, LogLevel } = require("@slack/bolt");
const { TwitterClient } = require("twitter-api-client");
const createApp = require("../../lib/app");

let config;
beforeEach(() => {
  config = {
    slack: {
      token: "test-slack-token",
    },
    db: {
      connectorType: "inmemory",
    },
    pinwheel: {
      pinReacji: "test-emoji",
      denyChannels: "deniedchannelone,deniedchanneltwo",
    },
    twitter: {},
  };
});
describe("bolt app factory", () => {
  it("uses passed config.slack and NODE_ENV", async () => {
    await createApp(config, { NODE_ENV: "development" });
    expect(SlackApp).toHaveBeenCalledWith(
      expect.objectContaining({
        token: "test-slack-token",
        logLevel: LogLevel.DEBUG,
      })
    );
  });
  it("sets a lower log level in prod", async () => {
    await createApp(config, { NODE_ENV: "production" });
    expect(SlackApp.mock.calls[0][0].logLevel).not.toBe(LogLevel.DEBUG);
  });
  it("registers a hello handler, an error handler, member_joined_channel handler, reaction_added handler, and reaction_removed handler", async () => {
    const app = await createApp(config);
    expect(typeof app._errorHandler).toBe("function");
    expect(app._registeredHandlers).toHaveProperty("hello");
    expect(app._registeredHandlers).toHaveProperty("member_joined_channel");
    expect(app._registeredHandlers).toHaveProperty("reaction_added");
    expect(app._registeredHandlers).toHaveProperty("reaction_added");
    expect(app._registeredHandlers).toHaveProperty("reaction_removed");
  });
  it("returns the app", async () => {
    const app = await createApp(config);
    expect(SlackApp.mock.instances[0]).toBe(app);
  });
  describe("connects to post->tweet database", () => {
    it("creates a db connector from env var type tag", async () => {
      config.db.connectorType = "inmemory";
      const app = await createApp(config);
      expect(app.dbConnector).toBeTruthy();
    });
    it("throws if DB_CONNECTOR_TYPE is not set", async () => {
      delete config.db.connectorType;
      await expect(() => createApp(config)).rejects.toThrowError(
        "DB_CONNECTOR_TYPE"
      );
    });
    it("throws if DB_CONNECTOR_TYPE is a value we don't have a connector implementation for", async () => {
      config.db.connectorType = "index cards";
      await expect(() => createApp(config)).rejects.toThrowError("index cards");
    });
  });
});
describe("app setup", () => {
  it("logs bot user info", async () => {
    const app = await createApp(config);
    const ctx = createHandlerContext(app);
    await app._registeredHandlers["hello"](ctx);
    expect(ctx.logger.info).toHaveBeenCalledWith(
      "it's-a me, ",
      expect.objectContaining({ botUserId: "bot-user-id" })
    );
  });
});
describe("error handling", () => {
  it("logs unhandled errors", async () => {
    const app = await createApp(config);
    const errorHandler = app.error.mock.calls[0][0];
    errorHandler(new Error("test"));
    expect(console.error).toHaveBeenCalled();
  });
});
describe("reaction_added handling", () => {
  it("does nothing on a reaction that is not the pin emoji", async () => {
    const app = await createApp(config);
    const ctx = createHandlerContext(app, {
      payload: {
        reaction: "eggplant",
        item: {
          type: "message",
          ts: "123456",
          channel: "channel1",
        },
      },
    });
    await app._registeredHandlers["reaction_added"](ctx);
    expect(TwitterClient).not.toHaveBeenCalled();
  });
  it("won't tweet something of an unknown type", async () => {
    const app = await createApp(config);
    const ctx = createHandlerContext(app, {
      payload: {
        reaction: "test-emoji",
        item: {
          type: "wat",
        },
      },
    });
    await app.dbConnector.save({
      ...ctx.payload.item,
      slack_id: "123456",
    });
    await app._registeredHandlers["reaction_added"](ctx);
    expect(ctx.logger.error).toHaveBeenCalledWith(
      expect.stringContaining("unknown")
    );
    expect(TwitterClient).not.toHaveBeenCalled();
  });
  describe("handling regular chat messages", () => {
    function pinnedMessage(app, text, overrides = {}) {
      const ctx = createHandlerContext(app, {
        payload: {
          reaction: "test-emoji",
          item: {
            type: "message",
            ts: "123456",
            channel: "channel1",
          },
        },
        ...overrides,
      });
      ctx.client.reactions.get.mockResolvedValueOnce({
        reactions: [
          {
            name: "test-emoji",
            count: 1,
          },
        ],
        message: {
          ts: "123456",
          text,
        },
      });
      return ctx;
    }
    describe("tweets and saves reference", () => {
      async function pinFlanders(who = "neighbor") {
        const app = await createApp(config);
        const ctx = pinnedMessage(app, `howdly doodly, ${who}ino`);
        await app._registeredHandlers["reaction_added"](ctx);
        return { app, ctx };
      }
      it("calls twitter api with message text", async () => {
        const { ctx } = await pinFlanders("neighbor");
        expect(ctx.logger.error).not.toHaveBeenCalled();
        expect(TwitterClient).toHaveBeenCalled();
        const twitterClient = TwitterClient.mock.instances[0];
        expect(twitterClient.tweets.statusesUpdate).toHaveBeenCalledWith(
          expect.objectContaining({ status: "howdly doodly, neighborino" })
        );
      });
      it("decodes slack-specific html entities", async () => {
        await pinFlanders("&lt;&amp;&gt;&lt;");
        const twitterClient = TwitterClient.mock.instances[0];
        expect(twitterClient.tweets.statusesUpdate).toHaveBeenCalledWith(
          expect.objectContaining({ status: "howdly doodly, <&><ino" })
        );
      });
      it("stores to db", async () => {
        const { app } = await pinFlanders("al pac");
        await expect(
          app.dbConnector.load({
            type: "message",
            slack_id: "123456",
          })
        ).resolves.toHaveProperty("tweet_id", "123tweeet");
      });
    });
    it("won't tweet something that has already been twote", async () => {
      const app = await createApp(config);
      const ctx = pinnedMessage(app, "i have been tweted hence");
      await app.dbConnector.save({
        ...ctx.payload.item,
        slack_id: "123456",
        tweet_id: "98765",
      });
      await app._registeredHandlers["reaction_added"](ctx);
      expect(ctx.logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("already")
      );
      expect(TwitterClient).not.toHaveBeenCalled();
    });
    it("won't tweet something that has 'forbidden' flag in db", async () => {
      const app = await createApp(config);
      const ctx = pinnedMessage(app, "i have been tweted hence");
      await app.dbConnector.save({
        ...ctx.payload.item,
        slack_id: "123456",
        forbidden: true,
      });
      await app._registeredHandlers["reaction_added"](ctx);
      expect(ctx.logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("forbidden")
      );
      expect(TwitterClient).not.toHaveBeenCalled();
    });
    it("won't tweet something too long", async () => {
      const app = await createApp(config);
      const ctx = pinnedMessage(
        app,
        "We don't want to rely on Twitter to kick out messages that are too long, at least for now. Later we may need Twitter to tell us how long a message is after we've processed emojis and the like, but for now, we need to demonstrate that there is a code path for doing something fancier. Or maybe none of that's true, but this message sure is more than 280 characters long."
      );
      await app._registeredHandlers["reaction_added"](ctx);
      expect(ctx.logger.error).toHaveBeenCalledWith(
        expect.stringMatching("too long")
      );
    });
    it("won't tweet a message from a denied channel", async () => {
      const app = await createApp(config);
      const ctx = pinnedMessage(app, "oh boy this is private");
      ctx.payload.item.channel = "deniedchannel1";
      await app._registeredHandlers["reaction_added"](ctx);
      expect(TwitterClient).not.toHaveBeenCalled();
      expect(ctx.logger.error).toHaveBeenCalledWith(
        expect.stringMatching("not supposed")
      );
    });
    it("won't tweet if it can't verify recognized channels", async () => {
      const app = await createApp(config);
      const ctx = pinnedMessage(app, "oh boy this is private");
      ctx.payload.item.channel = "private-message";
      ctx.client.conversations.list = app.client.conversations.list = () =>
        Promise.reject(new Error("wuh oh"));
      await app._registeredHandlers["reaction_added"](ctx);
      expect(ctx.logger.error).toHaveBeenCalledWith(
        expect.stringMatching("wuh oh")
      );
    });
    it("logs informatively if twitter client throws a JS error", async () => {
      TwitterClient.mockImplementationOnce(() => ({
        tweets: {
          statusesUpdate: () => {
            throw new Error("fail whale");
          },
        },
      }));
      const app = await createApp(config);
      const ctx = pinnedMessage(app, "woah");
      await app._registeredHandlers["reaction_added"](ctx);
      expect(ctx.logger.error).toHaveBeenCalledWith(
        expect.stringContaining("fail whale")
      );
    });
    it("logs informatively if twitter throws a JS error", async () => {
      TwitterClient.mockImplementationOnce(() => ({
        tweets: {
          statusesUpdate: () => {
            return Promise.reject({ errors: [{ message: "fail whale" }] });
          },
        },
      }));
      const app = await createApp(config);
      const ctx = pinnedMessage(app, "woah");
      await app._registeredHandlers["reaction_added"](ctx);
      expect(ctx.logger.error).toHaveBeenCalledWith(
        expect.stringContaining("fail whale")
      );
    });
    it("logs informatively if db store fails", async () => {
      const app = await createApp(config);
      app.dbConnector.save = () => {
        throw new Error("no database");
      };
      const ctx = pinnedMessage(app, "woah");
      await app._registeredHandlers["reaction_added"](ctx);
      expect(ctx.logger.error).toHaveBeenCalledWith(
        expect.stringContaining("no database")
      );
    });
  });
});

describe("member_joined_channel handling", () => {
  it("ignores when it isnt the one joining", async () => {
    const app = await createApp(config);
    const ctx = createHandlerContext(app, {
      payload: {
        channel: "deniedchannel1",
        user: "some-nobody",
      },
    });
    await app._registeredHandlers["member_joined_channel"](ctx);
    expect(ctx.client.conversations.leave).not.toHaveBeenCalled();
  });
  it("leaves if it joined a denied channel", async () => {
    const app = await createApp(config);
    const ctx = createHandlerContext(app, {
      payload: {
        channel: "deniedchannel1",
        user: "bot-user-id",
      },
    });
    await app._registeredHandlers["member_joined_channel"](ctx);
    expect(ctx.client.conversations.leave).toHaveBeenCalled();
  });
  it("loads denied channels out of config, handles if unset", async () => {
    config.pinwheel.denyChannels = "";
    const app = await createApp(config);
    const ctx = createHandlerContext(app, {
      payload: {
        channel: "deniedchannel1",
        user: "bot-user-id",
      },
    });
    await app._registeredHandlers["member_joined_channel"](ctx);
    expect(ctx.client.conversations.leave).not.toHaveBeenCalled();
  });
  it("stays if the channel it joined is not denied", async () => {
    const app = await createApp(config);
    const ctx = createHandlerContext(app, {
      payload: {
        channel: "party",
        user: "bot-user-id",
      },
    });
    await app._registeredHandlers["member_joined_channel"](ctx);
    expect(ctx.client.conversations.leave).not.toHaveBeenCalled();
  });
});

describe("reaction_removed handling", () => {
  function removedPin(app, { reactions }) {
    const ctx = createHandlerContext(app, {
      payload: {
        reaction: "test-emoji",
        item: {
          type: "message",
          ts: "123456",
        },
      },
    });
    ctx.client.reactions.get.mockResolvedValueOnce({
      reactions:
        reactions > 0
          ? [
              {
                name: "test-emoji",
                count: reactions,
              },
            ]
          : [],
      message: {
        ts: "123456",
      },
    });
    return ctx;
  }
  it("will not remove anything that still has pin reacts", async () => {
    const app = await createApp(config);
    jest.spyOn(app.dbConnector, "load");
    const ctx = removedPin(app, { reactions: 4 });
    await app._registeredHandlers["reaction_removed"](ctx);
    expect(app.dbConnector.load).not.toHaveBeenCalled();
    expect(TwitterClient).not.toHaveBeenCalled();
    expect(ctx.logger.info).toHaveBeenCalledWith(
      expect.stringContaining("reacts left")
    );
  });
  it("will not call twitter if a tweet is not found in the db", async () => {
    const app = await createApp(config);
    const ctx = removedPin(app, { reactions: 0 });
    await app._registeredHandlers["reaction_removed"](ctx);
    expect(TwitterClient).not.toHaveBeenCalled();
    expect(ctx.logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("does not have a tweet")
    );
  });
  describe("deletes tweet from twitter and db", () => {
    let app;
    let ctx;
    beforeEach(async () => {
      app = await createApp(config);
      ctx = removedPin(app, { reactions: 0 });
      await app.dbConnector.save({
        ...ctx.payload.item,
        slack_id: "123456",
        tweet_id: "98765",
      });
      await app._registeredHandlers["reaction_removed"](ctx);
    });
    it("calls twitter statusesDestroyById method", async () => {
      expect(TwitterClient).toHaveBeenCalled();
      const twitterClient = TwitterClient.mock.instances[0];
      expect(twitterClient.tweets.statusesDestroyById).toHaveBeenCalledWith(
        expect.objectContaining({ id: "98765" })
      );
    });
    it("removed tweet_id from db entry", async () => {
      await expect(
        app.dbConnector.load({
          type: "message",
          slack_id: "123456",
        })
      ).resolves.not.toHaveProperty("tweet_id");
    });
  });
});

function createHandlerContext(app, overrides) {
  return {
    context: {
      botId: "bot-id",
      botUserId: "bot-user-id",
    },
    client: app.client,
    logger: {
      warn: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    },
    say: jest.fn(),
    ...overrides,
  };
}
