function handleError (next) {
  return function handlesError (err) {
    if (err) {
      throw err;
    }
    next.apply(this, [].slice.call(arguments, 1));
  };
}

function getEnv (process) {
  return {
    vars: process.env,
    isDev: process.env.NODE_ENV === 'development',
    isProd: process.env.NODE_ENV === 'production'
  };
}

module.exports = {
  handleError: handleError,
  getEnv: getEnv
};
