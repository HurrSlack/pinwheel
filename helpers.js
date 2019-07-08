function handleError (next) {
  return function handlesError (err) {
    if (err) {
      throw err;
    }
    next.apply(this, [].slice.call(arguments, 1));
  };
}

function getEnv (process) {
  if (!process) {
    process = { env: {} };
  }
  return {
    vars: process.env,
    isDev: process.env.NODE_ENV === 'development',
    isProd: process.env.NODE_ENV === 'production'
  };
}

function logger (tag, works) {
  var log;
  if (!tag.match(/:\s*$/)) {
    tag += ': ';
  }
  if (works !== false) {
    log = function log () {
      console.log.apply(console, [tag].concat([].slice.call(arguments)));
    };
  } else {
    log = function noop () {};
  }
  log.sub = function (subtag, works) {
    return logger(tag + subtag, works);
  };
  return log;
}

function age (timestamp) {
  return Date.now() - new Date(timestamp * 1000).getTime();
}

age.SECOND = 1000;
age.MINUTE = age.SECOND * 60;
age.HOUR = age.MINUTE * 60;
age.DAY = age.HOUR * 24;

module.exports = {
  handleError: handleError,
  getEnv: getEnv,
  logger: logger,
  age: age
};
