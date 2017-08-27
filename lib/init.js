const Git = require("nodegit");
const path = require("path");
const fs = require("fs-extra");
const { getAllFiles } = require("./utils");

const CONFIG_FILENAME = "git-folder-sync.json";

async function initializeFolder(mainRepoPath, folderPaths, folderRepoPath) {
  try {
    const config = { mainRepoPath: "", folders: folderPaths };
    config.mainRepoPath = path.relative(folderRepoPath, mainRepoPath);
    await fs.ensureDir(folderRepoPath);
    const mainRepo = await Git.Repository.open(mainRepoPath);
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
    folderRepo.createCommitOnHead(
      (await folderRepo.getStatus()).map(file => file.path()),
      signature,
      signature,
      (await mainRepo.getMasterCommit()).sha()
    );
    await fs.writeJson(`${folderRepoPath}/${CONFIG_FILENAME}`, config);
  } catch (e) {
    console.log(e);
  }
}

module.exports = initializeFolder;
