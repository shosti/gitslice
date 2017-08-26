const Git = require("nodegit");
const path = require("path");
const fs = require("fs-extra");
const { getAllFiles } = require("./utils");

const CONFIG_FILENAME = "git-folder-sync.json";

async function updateFolderFromMain() {
  try {
    const config = await fs.readJson(CONFIG_FILENAME);
    const mainRepo = await Git.Repository.open(
      path.resolve(__dirname, config.mainRepoPath)
    );
    const folderRepo = await Git.Repository.open(__dirname);
    for (let file of getAllFiles(__dirname)) {
      if (
        !await Git.Ignore.pathIsIgnored(folderRepo, file) &&
        path.relative(__dirname, file) !== ".gitignore"
      ) {
        await fs.remove(file);
      }
    }
    // fileDelCmds.push(`find . -type d -empty -delete`);
    for (let p of config.folders) {
      const allFiles = getAllFiles(
        path.resolve(__dirname, config.mainRepoPath, p)
      );
      for (let sourceFile of allFiles) {
        if (!await Git.Ignore.pathIsIgnored(mainRepo, sourceFile)) {
          const desFile = sourceFile.replace(
            path.resolve(__dirname, config.mainRepoPath),
            __dirname
          );
          await fs.ensureFile(desFile);
          await fs.copy(sourceFile, desFile);
        }
      }
    }

    const repoStatus = await folderRepo.getStatus();
    if (repoStatus.length) {
      const signature = mainRepo.defaultSignature();
      folderRepo.createCommitOnHead(
        repoStatus.map(file => file.path()),
        signature,
        signature,
        (await mainRepo.getMasterCommit()).sha()
      );
      console.log("Folder updated");
    } else {
      console.log("Folder already up-to-date");
    }
  } catch (e) {
    console.log(e);
  }
}

module.exports = updateFolderFromMain
