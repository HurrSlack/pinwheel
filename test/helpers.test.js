/* global describe, it, beforeEach, afterEach */
var chai = require('chai');
var sinon = require('sinon');
var helpers = require('../helpers');

chai.should(); // extends native prototypes to provide fluent getters, caution

describe('the helper module', function () {
  describe('includes `handleError`, which wraps callbacks and', function () {
    var successData = {
      foo: 'bar'
    };
    var secondArg = {
      ya: 'fux'
    };
    function runAsync (callback, args, assertions) {
      setTimeout(function () {
        try {
          callback.apply(this, args);
        } catch (e) {}
        assertions();
      }, 15);
    }
    it('calls them on success with no `null` error argument', function (done) {
      // notice this doesn't take "err" as its first argument
      var successOnlyHandler = sinon.spy(function (data) {
        data.should.not.be.null;
        data.should.be.an('object');
        data.should.have.property('foo').that.equals('bar');
      });
      var handler = helpers.handleError(successOnlyHandler);
      runAsync(handler, [null, successData], function () {
        successOnlyHandler.calledOnce.should.be.true;
        successOnlyHandler.calledWithExactly(successData).should.be.true;
        done();
      });
    });
    it('passes an arbitrary number of arguments after err', function (done) {
      var arbitraryArgsHandler = sinon.spy(function (data, extraArg) {
        data.should.equal(successData);
        extraArg.should.equal(secondArg);
      });
      var handler = helpers.handleError(arbitraryArgsHandler);
      runAsync(handler, [null, successData, secondArg], function () {
        arbitraryArgsHandler.calledOnce.should.be.true;
        arbitraryArgsHandler.calledWithExactly(
          successData,
          secondArg
        ).should.be.true;
        done();
      });
    });
    it('throws an exception when the first arg exists', function (done) {
      // notice this doesn't take "err" as its first argument
      var onSuccess = sinon.spy();
      var handler = sinon.spy(helpers.handleError(onSuccess));
      var exception = Error('Alas!');
      runAsync(handler, [exception], function () {
        onSuccess.called.should.not.be.true;
        handler.threw(exception).should.be.true;
        done();
      });
    });
  });
  describe('includes `getEnv`, which takes a process global and', function () {
    var fakeProd = {
      env: {
        NODE_ENV: 'production'
      }
    };
    var fakeDev = {
      env: {
        NODE_ENV: 'development'
      }
    };
    var fakeAmbig = {
      env: {}
    };
    it('returns a `vars` collection equal to process.env', function () {
      helpers.getEnv(process).vars.should.equal(process.env);
    });
    it(
      'returns an `isProd` bool for `process.env.NODE_ENV === "production"`',
      function () {
        helpers.getEnv(fakeProd).isDev.should.be.false;
        helpers.getEnv(fakeDev).isDev.should.be.true;
        helpers.getEnv(fakeAmbig).isDev.should.be.false;
      }
    );
    it(
      'returns an `isDev` bool for `process.env.NODE_ENV === "development"`',
      function () {
        helpers.getEnv(fakeProd).isProd.should.be.true;
        helpers.getEnv(fakeProd).isDev.should.be.false;
        helpers.getEnv(fakeAmbig).isDev.should.be.false;
      }
    );
    it('returns blank vars and false bools when passed nothing', function () {
      var blankEnv = helpers.getEnv();
      blankEnv.vars.should.be.an('object');
      blankEnv.vars.should.be.empty;
      blankEnv.isDev.should.be.false;
      blankEnv.isProd.should.be.false;
    });
  });
  describe('includes `logger`, which creates a log object that', function () {
    var log, spy;
    var sampleObj = { isAn: 'object' };
    var sampleArray = ['is', 'an', 'array'];
    beforeEach(function () {
      log = helpers.logger('Test');
      spy = sinon.spy(console, 'log');
    });
    afterEach(function () {
      console.log.restore();
    });
    it('is a function', function () { log.should.be.a('function'); });
    it('logs to the console with the tag prefix when called', function () {
      log('string argument');
      spy.calledWithExactly('Test: ', 'string argument').should.be.true;
    });
    it('does nothing if its second factory arg was false, to allow loglevels',
      function () {
        var noLog = helpers.logger('Test', false);
        noLog('anything');
        spy.called.should.be.false;
      }
    );
    it('logs multiple arguments with the string prefix as first', function () {
      log('string argument', sampleObj, sampleArray);
      spy.calledWithExactly(
        'Test: ',
        'string argument',
        sampleObj,
        sampleArray
      ).should.be.true;
    });
    it(
      'has a `.sub` method that spawns another logger with prefix appended',
      function () {
        log.sub.should.be.a('function');
        var sublog = log.sub('Subtest');
        sublog(sampleObj);
        spy.withArgs('Test: Subtest: ').calledOnce.should.be.true;
      }
    );
    it('can nest these subloggers to arbitrary depth', function () {
      var sublog = log.sub('Subtest');
      sublog.sub.should.be.a('function');
      var subsublog = sublog.sub('SubSubtest');
      subsublog(sampleObj);
      spy.withArgs('Test: Subtest: SubSubtest: ').calledOnce.should.be.true;
    });
  });
  describe('includes `age`, which returns the ages of slack timestamps in ms', function () {
    it('returns a difference between now in milliseconds', function () {
      const later = new Date();
      later.setTime(later.getTime() - 4000);
      helpers.age(later.getTime() / 1000).should.be.approximately(4000, 500);
    });
    it('has convenience constants', function () {
      const later = new Date();
      later.setTime(later.getTime() - helpers.age.HOUR * 2);
      helpers.age(later.getTime() / 1000).should.be.approximately(helpers.age.MINUTE * 120, 500);
    });
  });
});
