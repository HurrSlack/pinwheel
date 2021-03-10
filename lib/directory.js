class Directory {
  constructor({ type, retrieve, client, token }) {
    this._type = type;
    this._retrieve = retrieve;
    this._client = client;
    this._token = token;
    if (!Directory.maps.has(type)) {
      this._map = new Map();
      Directory.maps.set(type, this._map);
    } else {
      this._map = Directory.maps.get(type);
    }
  }
  async byId(id) {
    if (!this._map.has(id)) {
      await (this._populating || this._populate());
    }
    if (!this._map.has(id)) {
      throw new Error(`Could not find ${this._type} with id ${id}`);
    }
    return this._map.get(id);
  }
  async get(id, prop) {
    const response = await this.byId(id);
    return response[prop];
  }
  async _populate() {
    this._populating = this._retrieve({
      client: this._client,
      token: this._token,
    });
    try {
      const entityList = await this._populating;
      for (const entity of entityList) {
        this._map.set(entity.id, entity);
      }
    } catch (e) {
      throw new Error(
        `Could not populate ${this._type} list. API error: ${JSON.stringify(
          e,
          null,
          2
        )}`
      );
    } finally {
      this._populating = null;
    }
  }
}

Directory.maps = new Map();

module.exports = Directory;
