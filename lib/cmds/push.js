const Git = require("nodegit");
const path = require("path");
const fs = require("fs-extra");
const { getAllFiles } = require("../utils");
const { CONFIG_FILENAME } = require("../constants");

async function updateMainFromFolder(currentDir, branchName, commitMsg) {
  try {
    const config = await fs.readJson(path.resolve(currentDir, CONFIG_FILENAME));
    const mainRepoPath = path.resolve(currentDir, config.mainRepoPath);
    const mainRepo = await Git.Repository.open(mainRepoPath);
    await mainRepo.checkoutBranch(config.branch);
    const folderRepo = await Git.Repository.open(currentDir);
    let branchAlreadyExists = false;
    (await mainRepo.getReferenceNames(Git.Reference.TYPE.LISTALL)).map(i => {
      if (i === `refs/heads/${branchName}`) {
        branchAlreadyExists = true;
      }
    });
    if (!branchAlreadyExists) {
      const newBranch = await mainRepo.createBranch(
        branchName,
        (await folderRepo.getMasterCommit()).message(),
        0 // gives error if the branch already exists
      );
    }
    await mainRepo.checkoutBranch(branchName);
    await mainRepo.setHead(`refs/heads/${branchName}`);

    for (let p of config.folders) {
      for (let file of await getAllFiles(path.resolve(mainRepoPath, p))) {
        if (
          !await Git.Ignore.pathIsIgnored(mainRepo, file) &&
          path.relative(mainRepoPath, file) !== ".gitignore"
        ) {
          await fs.remove(file);
        }
      }
    }

    for (let p of config.folders) {
      const allFiles = await getAllFiles(path.resolve(currentDir, p));
      for (let sourceFile of allFiles) {
        if (!await Git.Ignore.pathIsIgnored(folderRepo, sourceFile)) {
          const desFile = sourceFile.replace(currentDir, mainRepoPath);
          await fs.ensureFile(desFile);
          await fs.copy(sourceFile, desFile);
        }
      }
    }

    const repoStatus = await mainRepo.getStatus();
    if (repoStatus.length) {
      const signature = mainRepo.defaultSignature();
      let index = await mainRepo.refreshIndex();
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
      const parent = await mainRepo.getCommit(
        await Git.Reference.nameToId(mainRepo, "HEAD")
      );
      await mainRepo.createCommit(
        "HEAD",
        signature,
        signature,
        commitMsg,
        oid,
        [parent]
      );
      console.log(`${mainRepoPath} updated`);
    } else {
      console.log(`${mainRepoPath} already up-to-date`);
    }
  } catch (e) {
    console.log(e);
  }
}

module.exports = updateMainFromFolder;
