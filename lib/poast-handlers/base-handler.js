/**
 * @public
 * @typedef SlackDescriptor
 * @property {string} type - Slack entity type
 * @property {string} slack_id - Unique ID in the Slack instance
 */

/**
 * @public
 * @typedef Poast
 * @extends SlackDescriptor
 * @property {string} tweet_id - ID of tweet linked to Slack entity
 */

/**
 * A PoastHandler turns a type of Slack entity, e.g. "message", into tweets and
 * queries for tweet references.
 *
 * @class BasePoastHandler
 */
class BasePoastHandler {
  constructor(globalConfig, payload, client, directory, logger) {
    this.globalConfig = globalConfig;
    this.payload = payload;
    this.client = client;
    this.directory = directory;
    this.logger = logger;
  }
    /**
   * Return canonical object that database connectors can use to locate the
   * poast in the database by a unique ID.
   * @returns {SlackDescriptor}
   */
     getSlackDescriptor() {
       throw new Error(`${this.constructor.name} has not implemented getPoastDescriptor!!!`);
    }
}

// see https://api.slack.com/reference/surfaces/formatting#escaping
BasePoastHandler.decodeSlackEntities = (txt) =>
  txt.replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&amp;/gi, "&");

BasePoastHandler.BasePoastHandler = BasePoastHandler; // named import

module.exports = BasePoastHandler;
