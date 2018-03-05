const os = require("os");
const path = require("path");

const CONFIG_FILENAME = "git-slice.json";

const INVALID_ARG_MSG =
  "Invalid arguments, following are the usage details of this command:";

const TEMPORARY_FOLDER_NAME = path.join(os.tmpdir(), "git-slice");

module.exports = {
  CONFIG_FILENAME,
  INVALID_ARG_MSG,
  TEMPORARY_FOLDER_NAME
};
