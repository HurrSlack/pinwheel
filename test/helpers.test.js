/* global describe, it */
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
    describe('calls them on success', function () {
      it('with no `null` error argument', function (done) {
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
      it('with an arbitrary number of arguments', function (done) {
        // notice this doesn't take "err" as its first argument
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
});
