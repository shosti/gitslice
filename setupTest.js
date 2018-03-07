const jest = require("jest");

const argv = process.argv.slice(2);
process.env.NODE_ENV = "test";

// Watch unless on CI, in coverage mode, or explicitly running all tests
if (
  !process.env.CI &&
  argv.indexOf("--coverage") === -1 &&
  argv.indexOf("--watchAll") === -1
) {
  argv.push("--watch");
}

jest.run(argv);
