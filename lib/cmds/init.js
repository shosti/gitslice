const Git = require("nodegit");
const path = require("path");
const fs = require("fs-extra");
const { getAllFiles } = require("../utils");
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
      branchInMain: {}
    };
    await fs.ensureDir(folderRepoPath);
    const mainRepo = await Git.Repository.open(mainRepoPath);
    await mainRepo.checkoutBranch(branchName);
    const folderRepo = await Git.Repository.init(folderRepoPath, 0);

    for (let p of folderPaths) {
      const allFiles = await getAllFiles(path.resolve(mainRepoPath, p));
      for (let sourceFile of allFiles) {
        if (!await Git.Ignore.pathIsIgnored(mainRepo, sourceFile)) {
          const desFile = sourceFile.replace(mainRepoPath, folderRepoPath);
          await fs.ensureFile(desFile);
          await fs.copy(sourceFile, desFile);
        }
      }
    }

    await fs.appendFile(`${folderRepoPath}/.gitignore`, `\n${CONFIG_FILENAME}`);
    const signature = mainRepo.defaultSignature();
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
      (await mainRepo.getHeadCommit()).sha(),
      oid,
      null
    );
    await fs.writeJson(`${folderRepoPath}/${CONFIG_FILENAME}`, config);
  } catch (e) {
    return Promise.reject(e);
  }
}

module.exports = initializeFolder;
