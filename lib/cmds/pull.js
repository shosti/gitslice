const Git = require("nodegit");
const path = require("path");
const fs = require("fs-extra");
const { getAllFiles, addCommmitMsgPrefix, cloneMainRepo } = require("../utils");
const { CONFIG_FILENAME } = require("../constants");

async function updateFolderFromMain(currentDir) {
  try {
    const config = await fs.readJson(path.resolve(currentDir, CONFIG_FILENAME));
    const mainRepoPath = await cloneMainRepo(currentDir, config.repoUrl);
    const mainRepo = await Git.Repository.open(mainRepoPath);
    await mainRepo.checkoutBranch(config.branch);
    const folderRepo = await Git.Repository.open(currentDir);
    if ((await folderRepo.getStatus()).length) {
      throw "Error: cannot pull with uncommitted changes";
    }

    await folderRepo.checkoutBranch("master");
    await folderRepo.setHead(`refs/heads/master`);

    for (let file of await getAllFiles(currentDir)) {
      if (
        !await Git.Ignore.pathIsIgnored(folderRepo, file) &&
        config.ignore.indexOf(path.relative(currentDir, file)) === -1
      ) {
        await fs.remove(file);
      }
    }
    // fileDelCmds.push(`find . -type d -empty -delete`);
    for (let p of config.folders) {
      const allFiles = await getAllFiles(path.resolve(mainRepoPath, p));
      for (let sourceFile of allFiles) {
        if (
          !await Git.Ignore.pathIsIgnored(mainRepo, sourceFile) &&
          config.ignore.indexOf(path.relative(mainRepoPath, sourceFile)) === -1
        ) {
          const desFile = sourceFile.replace(mainRepoPath, currentDir);
          await fs.ensureFile(desFile);
          await fs.copy(sourceFile, desFile);
        }
      }
    }

    const repoStatus = await folderRepo.getStatus();
    if (repoStatus.length) {
      const signature = folderRepo.defaultSignature();
      let index = await folderRepo.refreshIndex();
      for (let deletedFilePath of repoStatus
        .filter(file => file.isDeleted())
        .map(file => file.path())) {
        await index.remove(deletedFilePath, 0);
      }
      for (let addOrModifiedFilePath of repoStatus
        .filter(file => !file.isDeleted())
        .map(file => file.path())) {
        await index.addByPath(addOrModifiedFilePath);
      }
      await index.write();
      const oid = await index.writeTree();
      const parent = await folderRepo.getCommit(
        await Git.Reference.nameToId(folderRepo, "HEAD")
      );
      await folderRepo.createCommit(
        "HEAD",
        signature,
        signature,
        addCommmitMsgPrefix((await mainRepo.getHeadCommit()).sha()),
        oid,
        [parent]
      );
      console.log(`This repo is updated successfully`);
    } else {
      console.log(`This repo already up-to-date`);
    }
  } catch (e) {
    return Promise.reject(e);
  }
}

module.exports = updateFolderFromMain;
