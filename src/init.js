const Git = require("nodegit");
const path = require("path");
const fs = require("fs-extra");
const { getAllFiles } = require("./utils");

const CONFIG_FILENAME = "git-folder-sync.json";

async function initializeFolder(repoPath, folderPaths, localFolderName) {
  try {
    const config = { mainRepoPath: "", folders: folderPaths };
    const folderRepoPath = path.resolve(__dirname, localFolderName);
    const mainRepoPath = path.resolve(__dirname, repoPath);
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
    console.log("Folder initialized!");
  } catch (e) {
    console.log(e);
  }
}

module.exports = initializeFolder;
