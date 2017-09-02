const Git = require("nodegit");
const path = require("path");
const fs = require("fs-extra");
const { getAllFiles } = require("./utils");

const CONFIG_FILENAME = "git-fork.json";

async function updateFolderFromMain(currentDir) {
  try {
    const config = await fs.readJson(CONFIG_FILENAME);
    const mainRepoPath = path.resolve(currentDir, config.mainRepoPath);
    const mainRepo = await Git.Repository.open(mainRepoPath);
    const folderRepo = await Git.Repository.open(currentDir);
    for (let file of await getAllFiles(currentDir)) {
      if (
        !await Git.Ignore.pathIsIgnored(folderRepo, file) &&
        path.relative(currentDir, file) !== ".gitignore"
      ) {
        await fs.remove(file);
      }
    }
    // fileDelCmds.push(`find . -type d -empty -delete`);
    for (let p of config.folders) {
      const allFiles = await getAllFiles(path.resolve(mainRepoPath, p));
      for (let sourceFile of allFiles) {
        if (!await Git.Ignore.pathIsIgnored(mainRepo, sourceFile)) {
          const desFile = sourceFile.replace(mainRepoPath, currentDir);
          await fs.ensureFile(desFile);
          await fs.copy(sourceFile, desFile);
        }
      }
    }

    const repoStatus = await folderRepo.getStatus();
    if (repoStatus.length) {
      const signature = mainRepo.defaultSignature();
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
        (await mainRepo.getMasterCommit()).sha(),
        oid,
        [parent]
      );
      console.log("Folder updated successfully");
    } else {
      console.log("Folder already up-to-date");
    }
  } catch (e) {
    console.log(e);
  }
}

module.exports = updateFolderFromMain;
