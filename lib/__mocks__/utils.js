const utils = jest.genMockFromModule("../utils");

const pushTempRepo = function(branch) {
  console.log("Mocked function runs...");
};

module.exports = {
  ...utils,
  pushTempRepo
};
