const { BasePoastHandler } = require("../../lib/poast-handlers/base-handler");

describe("poast handlers", () => {
  describe("base class", () => {
    it("throws if abstract getSlackDescriptor is called", () => {
      expect(() => new BasePoastHandler().getSlackDescriptor()).toThrow();
    });
  });
});
