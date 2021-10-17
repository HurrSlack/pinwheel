/**
 * @typedef {import('../poast-handlers/base-handler.js').SlackDescriptor} SlackDescriptor
 * @typedef {import('../poast-handlers/base-handler.js').Poast} Poast
 */
const mysql = require("mysql2/promise");
const BaseConnector = require("./base-connector");
/**
 * Yeah it's my very own sql
 */
class MysqlConnector extends BaseConnector {
  async connect() {
    this.connection = await mysql.createConnection(this.config);
  }
  async disconnect() {
    await this.connection.destroy();
  }
  async load(descriptor) {
    const [rows] = await this.connection.execute(
      "SELECT * FROM `poasts` WHERE `slack_id` = ? LIMIT 1",
      [descriptor.slack_id]
    );
    if (rows.length === 0) {
      return descriptor;
    }
    return rows[0];
  }
  async save(poast) {
    if (!poast.tweet_id) {
      await this.connection.execute(
        "DELETE FROM `poasts` WHERE slack_id = ? AND type = ?",
        [poast.slack_id, poast.type]
      );
    } else {
      await this.connection.execute(
        "INSERT INTO `poasts` (type,slack_id,tweet_id) VALUES (?,?,?) ON DUPLICATE KEY UPDATE tweet_id=?",
        [poast.type, poast.slack_id, poast.tweet_id, poast.tweet_id]
      );
    }
  }
}

module.exports = MysqlConnector;
