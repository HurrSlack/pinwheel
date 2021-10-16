/* eslint-disable no-unused-vars */
/**
 * @typedef {import('../poast-handlers/base-handler.js').SlackDescriptor} SlackDescriptor
 * @typedef {import('../poast-handlers/base-handler.js').Poast} Poast
 */

/**
 * Wraps a persistence layer which can turn a {@link SlackDescriptor} into a
 * {@link Poast}.
 */
class BaseConnector {
  /**
   * Create a dbConnector.
   * @memberof BaseConnector
   * @param {object} config - Namespaced and camelcased config gathered from environment.
   */
  constructor(config) {
    /** @property {object} config - Config injected into constructor. */
    this.config = config;
  }
  /**
   *
   * @async
   * @returns {Promise} - Resolves to null, indicating connection ready
   * @memberof BaseConnector
   */
  async connect() {}
  /**
   *
   * @async
   * @returns {Promise} - Resolves to null, indicating connection closed
   * @memberof BaseConnector
   */
  async disconnect() {}
  /**
   *
   * @param {SlackDescriptor} descriptor - ID of Slack entity to look up poasts for
   * @returns {Promise<(Poast|null)>}
   */
  async load(descriptor) {}
  /**
   *
   * @param {Poast} poast - Entity to save to db, tying a slack ID to a tweet
   * @returns {null}
   */
  async save(poast) {}
}

module.exports = BaseConnector;
