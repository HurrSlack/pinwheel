var LRU = require('lru-cache');

var TWEET_STAGED = 'staged';

function itemToKey (item) {
  return JSON.stringify(item.item || item);
}

function TweetCache () {
  this._itemCache = LRU({
    max: 5000,
    maxAge: 2.628e9, // one month
    length: function (n, key) { return key.length; }
  });
  this.stage({});
}

// TODO: store tweet id in cache so it can be detwote later
TweetCache.prototype.stage = function stage (item) {
  return this._itemCache.set(itemToKey(item), TWEET_STAGED);
};

TweetCache.prototype.set = function (item, id) {
  return this._itemCache.set(itemToKey(item), id);
};
TweetCache.prototype.get = function (item) {
  return this._itemCache.get(itemToKey(item));
};
TweetCache.prototype.drop = function (item) {
  return this._itemCache.del(itemToKey(item));
};

module.exports = TweetCache;
