const firebaseAdmin = require("firebase-admin");
const debug = require("debug")("pinwheel:connector:firebase");

/**
 * Connect to Google Cloud Firebase. Requires a "service account" object
 * provided as the config.
 * @link https://firebase.google.com/docs/admin/setup#initialize-sdk
 */
class FirebaseConnector {
  constructor(config) {
    this.credential = config;
    const initResult = firebaseAdmin.initializeApp({
      credential: firebaseAdmin.credential.cert(this.credential),
    });
    this.db = firebaseAdmin.firestore();
    debug("created with init result %O, db %O", initResult, this.db);
  }
  async connect() {
    // no action necessary
  }
  async disconnect() {
    // unsure if this action is really necessary
    // await this.db.terminate();
  }
  async load(poastDescriptor) {
    debug("load() from descriptor %O", poastDescriptor);
    const doc = await this.db
      .collection(poastDescriptor.type)
      .doc(poastDescriptor.slack_id)
      .get();
    if (!doc.exists) {
      debug("doc does not exist for %O: %O", poastDescriptor, doc);
      return poastDescriptor;
    }
    return doc.data();
  }
  async save(poast) {
    debug("save() %O", poast);
    const result = await this.db
      .collection(poast.type)
      .doc(poast.slack_id)
      .set(poast);
    debug("save success: %O", result);
  }
}

module.exports = FirebaseConnector;
