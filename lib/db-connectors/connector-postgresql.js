/**
 * @typedef {import('../poast-handlers/base-handler.js').SlackDescriptor} SlackDescriptor
 * @typedef {import('../poast-handlers/base-handler.js').Poast} Poast
 */
const postgres = require("postgres");
const BaseConnector = require("./base-connector");
const debug = require("debug")("pinwheel:connector:postgres");
/**
 * poasts ingress in to postgres
 */
class PostgresqlConnector extends BaseConnector {
  async connect() {
    debug("connect()");
    const outerDebug = debug;
    const sql = postgres({
      ...this.config,
      debug(_, query, params, types) {
        outerDebug(query, params, types);
      },
    });
    this.connection = sql;
    debug("connect() succeeded");
    debug("create table if not exists");

    const result = await sql`
  CREATE TABLE IF NOT EXISTS public.poasts (
      type character varying(20),
      slack_id character varying(32) UNIQUE,
      tweet_id character varying(32)
  );`;
    debug("table upserted: %O", result);
  }
  async disconnect() {
    debug("disconnect()");
    await this.connection.end();
    debug("disconnect() succeeded");
  }
  async load(descriptor) {
    const sql = this.connection;
    debug("load() from descriptor %O", descriptor);
    const result = await sql`
      SELECT * FROM poasts WHERE slack_id = ${descriptor.slack_id} ORDER BY slack_id LIMIT 1;
    `;
    if (result.length === 0) {
      debug("load() nothing found for descriptor");
      return descriptor;
    }
    debug("load() succeeded, retrieved records %O", result);
    return result[0];
  }
  async save(poast) {
    debug("save() for poast %O", poast);
    const sql = this.connection;
    if (!poast.tweet_id) {
      debug("deleting because no tweet");
      const result = await sql`
        DELETE FROM poasts 
        WHERE slack_id = ${poast.slack_id}
        AND type = ${poast.type};
      `;
      debug("delete success: %O", result);
    } else {
      debug("upserting because tweet");
      const result = await sql`
        INSERT INTO poasts (type,slack_id,tweet_id)
        VALUES (${poast.type},${poast.slack_id},${poast.tweet_id})
        ON CONFLICT (slack_id)
        DO
          UPDATE SET tweet_id = EXCLUDED.tweet_id;
      `;
      debug("upsert success: %O", result);
    }
  }
}

module.exports = PostgresqlConnector;
