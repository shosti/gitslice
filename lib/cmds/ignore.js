const path = require("path");
const fs = require("fs-extra");
const { CONFIG_FILENAME } = require("../constants");

async function modifyIgnoredFiles(currentDir, filesToAdd, filesToRemove) {
  try {
    const config = await fs.readJson(path.resolve(currentDir, CONFIG_FILENAME));
    const commonFileExists = filesToAdd.some(function(v) {
      return filesToRemove.indexOf(v) >= 0;
    });
    if (commonFileExists) {
      console.log(
        "Error: Both add and remove operation is being performed on the same file"
      );
      return;
    }
    let updatedIgnoredFiles = config.ignore;
    if (filesToAdd.length) {
      //TODO: remove duplicates while adding
      updatedIgnoredFiles = [...updatedIgnoredFiles, ...filesToAdd];
    }
    if (filesToRemove.length) {
      updatedIgnoredFiles = updatedIgnoredFiles.filter(
        x => filesToRemove.indexOf(x) === -1
      );
    }

    await fs.writeJson(
      `${currentDir}/${CONFIG_FILENAME}`,
      {
        ...config,
        ignore: updatedIgnoredFiles
      },
      { spaces: 2 }
    );
    console.log(`Ignored files are sucessfully updated`);
  } catch (e) {
    return Promise.reject(e);
  }
}

module.exports = modifyIgnoredFiles;
