/* global $ */
var path = require('path');
var helpers = require('./helpers');
var env = helpers.getEnv(process);

require('dotenv').config({
  path: path.resolve('./env_variables'),
  silent: env.vars.NODE_ENV !== 'development'
});

var phantom = require('phantom');
var _ph, _page;

module.exports = function createSlackImage (archiveUrl, callback) {
  console.log('archive : ' + archiveUrl);
  phantom.create().then(ph => {
    _ph = ph;
    return _ph.createPage();
  }).then(page => {
    _page = page;
    return page.property('viewportSize', { width: 320, height: 480 });
  }).then(() => {
    return _page.open(archiveUrl);
  }).then(status => {
    console.log(status);
    return _page.evaluate(function (credential) {
      $('#email').val(credential[0]);
      $('#password').val(credential[1]);
      $('#signin_btn').click();
    }, [env.vars.SLACK_USERNAME, env.vars.SLACK_PASSWORD]);
  }).then(wat => {
    function checkHighlight () {
      return _page.evaluate(function () {
        return !!document.querySelector('.highlight');
      });
    }
    var times = 0;
    return new Promise((resolve, reject) => {
      setTimeout(function waitForHighlight () {
        checkHighlight().then(exists => {
          if (exists) {
            resolve(exists);
          } else if (times++ > 9) {
            console.log('giving up');
            reject(Error('never found highlighted element'));
          } else {
            setTimeout(waitForHighlight, 1000);
          }
        });
      }, 9000);
    });
  }).then(yey => {
    return _page.evaluate(function () {
      var message = document.querySelector('.highlight');
      message.classList.remove('highlight');
      message.scrollIntoView();
      var messageBody = message.querySelector('.message_body');
      messageBody.style.padding = '10px';
      var box = messageBody.getBoundingClientRect();
      var jqbox = $(messageBody).offset(); // only jquery gets this right, for some reason
      return {
        top: jqbox.top,
        left: jqbox.left,
        width: box.width,
        height: box.height
      };
    });
  }).then(rect => {
    console.log('the rect', rect);
    return _page.property('clipRect', rect);
  }).then(() => {
    return _page.render('out.png');
  }).then(() => {
    console.log('holy shit it worked');
    _page.close();
    _ph.exit();
    require('fs').readFile('out.png', 'base64', callback);
  }).catch(e => {
    console.error(e);
    _page.close();
    _ph.exit();
  });
};
