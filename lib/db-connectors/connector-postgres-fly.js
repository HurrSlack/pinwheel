/**
 * @typedef {import('../poast-handlers/base-handler.js').SlackDescriptor} SlackDescriptor
 * @typedef {import('../poast-handlers/base-handler.js').Poast} Poast
 */
const postgres = require("postgres");
const PostgresqlConnector = require("./connector-postgresql");
const debug = require("debug")("pinwheel:connector:postgres-fly");
/**
 * fly.io stores its postgres info as a url in DATABASE_URL
 */
class FlyPostgresConnector extends PostgresqlConnector {
  async connect() {
    debug("connect()");
    const outerDebug = debug;
    const sql = postgres(process.env.DATABASE_URL, {
      debug(_, query, params, types) {
        outerDebug(query, params, types);
      },
    });
    this.connection = sql;
    debug("connect() succeeded");
    debug("create table if not exists");
  }
}

module.exports = FlyPostgresConnector;
