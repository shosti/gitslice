const Git = require("nodegit");
const path = require("path");
const fs = require("fs-extra");
const { getAllFiles } = require("./utils");

const CONFIG_FILENAME = "git-folder-sync.json";
const BRANCH_NAME = "murcul";

async function updateMainFromFolder(commitMsg) {
  try {
    const config = await fs.readJson(CONFIG_FILENAME);
    const mainRepoPath = path.resolve(__dirname, config.mainRepoPath);
    const mainRepo = await Git.Repository.open(mainRepoPath);
    const folderRepo = await Git.Repository.open(__dirname);
    const newBranch = await mainRepo.createBranch(
      BRANCH_NAME,
      (await folderRepo.getMasterCommit()).message(),
      0 // gives error if the branch already exists
    );
    await mainRepo.checkoutBranch(BRANCH_NAME);
    await mainRepo.setHead(`refs/heads/${BRANCH_NAME}`)

    for (let p of config.folders) {
      for (let file of getAllFiles(path.resolve(mainRepoPath, p))) {
        if (
          !await Git.Ignore.pathIsIgnored(mainRepo, file) &&
          path.relative(mainRepoPath, file) !== ".gitignore"
        ) {
          await fs.remove(file);
        }
      }
    }

    for (let p of config.folders) {
      const allFiles = getAllFiles(path.resolve(__dirname, p));
      for (let sourceFile of allFiles) {
        if (!await Git.Ignore.pathIsIgnored(folderRepo, sourceFile)) {
          const desFile = sourceFile.replace(__dirname, mainRepoPath);
          await fs.ensureFile(desFile);
          await fs.copy(sourceFile, desFile);
        }
      }
    }

    const mainRepoStatus = await mainRepo.getStatus();
    console.log(mainRepoStatus.map(file => file.path()));
    if (mainRepoStatus.length) {
      const signature = mainRepo.defaultSignature();
      mainRepo.createCommitOnHead(
        mainRepoStatus.map(file => file.path()),
        signature,
        signature,
        commitMsg
      );
      console.log("Main Repo updated");
    } else {
      console.log("Main Repo already up-to-date");
    }
  } catch (e) {
    console.log(e);
  }
}

module.exports = updateMainFromFolder;