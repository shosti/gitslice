jest.unmock("../utils");
const utils = require("../utils");

utils.pushTempRepo = jest.fn();

module.exports = utils;
