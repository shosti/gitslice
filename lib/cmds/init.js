const Git = require("nodegit");
const path = require("path");
const fs = require("fs-extra");
const { getAllFiles, addCommmitMsgPrefix } = require("../utils");
const { CONFIG_FILENAME } = require("../constants");

async function initializeFolder(
  mainRepoPath,
  folderPaths,
  folderRepoPath,
  branchName
) {
  try {
    const config = {
      mainRepoPath: path.relative(folderRepoPath, mainRepoPath),
      folders: folderPaths,
      branch: branchName,
      branchInMain: {},
      ignore: [ CONFIG_FILENAME ]
    };
    await fs.ensureDir(folderRepoPath);
    const mainRepo = await Git.Repository.open(mainRepoPath);
    await mainRepo.checkoutBranch(branchName);
    const folderRepo = await Git.Repository.init(folderRepoPath, 0);

    for (let p of folderPaths) {
      const allFiles = await getAllFiles(path.resolve(mainRepoPath, p));
      for (let sourceFile of allFiles) {
        if (
          !await Git.Ignore.pathIsIgnored(mainRepo, sourceFile) &&
          config.ignore.indexOf(path.relative(mainRepoPath, sourceFile)) === -1
        ) {
          const desFile = sourceFile.replace(mainRepoPath, folderRepoPath);
          await fs.ensureFile(desFile);
          await fs.copy(sourceFile, desFile);
        }
      }
    }

    await fs.writeJson(`${folderRepoPath}/${CONFIG_FILENAME}`, config, {
      spaces: 2
    });
    const signature = folderRepo.defaultSignature();
    let index = await folderRepo.refreshIndex();
    for (let addFilePath of (await folderRepo.getStatus()).map(file =>
      file.path()
    )) {
      await index.addByPath(addFilePath);
    }
    await index.write();
    const oid = await index.writeTree();
    await folderRepo.createCommit(
      "HEAD",
      signature,
      signature,
      addCommmitMsgPrefix((await mainRepo.getHeadCommit()).sha()),
      oid,
      null
    );
  } catch (e) {
    return Promise.reject(e);
  }
}

module.exports = initializeFolder;
