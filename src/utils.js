const fs = require("fs-extra");
const path = require("path");

function getAllFiles(dir) {
  return fs.readdirSync(dir)
    .reduce(
      (files, file) =>
        fs.statSync(path.join(dir, file)).isDirectory()
          ? files.concat(getAllFiles(path.join(dir, file)))
          : files.concat(path.join(dir, file)),
      []
    );
}

module.exports = {
  getAllFiles
};
