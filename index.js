const fs = require("mz/fs");
const path = require("path");
const argv = require("minimist")(process.argv.slice(2));
const Git = require("nodegit");
const { exec } = require("child-process-promise");

const CONFIG_FILENAME = "git-folder-sync.json";

switch (argv._[0]) {
  case "init":
    // git-folder-sync init [repo path] [first/folder/path/from/root] [second/folder/path/from/root] [local folder name]
    initializeFolder(
      argv._[1],
      argv._.slice(2, argv._.length - 1),
      argv._[argv._.length - 1]
    );
    break;
  case "pull":
    // git-folder-sync pull
    // Run this command with in the folder
    updateFolderFromMain();
    break;
  case "push":
    // git-folder-sync push [commit message]
    updateMainFromFolder(argv._[1]);
    break;
  default:
    showHelp();
}

async function initializeFolder(repoPath, folderPaths, localFolderName) {
  try {
    const config = { mainRepoPath: "", folders: folderPaths };
    const folderRepoPath = path.resolve(__dirname, localFolderName);
    const mainRepoPath = path.resolve(__dirname, repoPath);
    config.mainRepoPath = path.relative(folderRepoPath, mainRepoPath);

    if (!fs.existsSync(folderRepoPath)) {
      await exec(`mkdir -p ${folderRepoPath}`);
    }
    const mainRepo = await Git.Repository.open(mainRepoPath);
    const folderRepo = await Git.Repository.init(folderRepoPath, 0);

    let fileCopyCmds = [];
    for (let p of folderPaths) {
      const allFiles = getAllFiles(path.resolve(mainRepoPath, p));
      for (let sourceFile of allFiles) {
        if (!await Git.Ignore.pathIsIgnored(mainRepo, sourceFile)) {
          const desFile = sourceFile.replace(mainRepoPath, folderRepoPath);
          fileCopyCmds.push(`mkdir -p $(dirname ${desFile})`);
          fileCopyCmds.push(`cp ${sourceFile} ${desFile}`);
        }
      }
    }
    if (fileCopyCmds.length) {
      await exec(fileCopyCmds.join(` && `));
    }

    await exec(`echo "${CONFIG_FILENAME}" >> ${folderRepoPath}/.gitignore`);
    const signature = mainRepo.defaultSignature();
    folderRepo.createCommitOnHead(
      (await folderRepo.getStatus()).map(file => file.path()),
      signature,
      signature,
      (await mainRepo.getMasterCommit()).sha()
    );
    await fs.writeFile(
      `${folderRepoPath}/${CONFIG_FILENAME}`,
      JSON.stringify(config)
    );
    console.log("Folder initialized!");
  } catch (e) {
    console.log(e);
  }
}

async function updateFolderFromMain() {
  try {
    const config = JSON.parse(await fs.readFile(CONFIG_FILENAME, "utf8"));
    const mainRepo = await Git.Repository.open(
      path.resolve(__dirname, config.mainRepoPath)
    );
    const folderRepo = await Git.Repository.open(__dirname);
    let fileDelCmds = [];
    for (let file of getAllFiles(__dirname)) {
      if (
        !await Git.Ignore.pathIsIgnored(mainRepo, file) &&
        !await Git.Ignore.pathIsIgnored(folderRepo, file) &&
        !path.relative(__dirname, file) === ".gitignore"
      ) {
        fileDelCmds.push(`rm ${file}`);
      }
    }
    fileDelCmds.push(`find . -type d -empty -delete`); // delete empty folders
    if (fileDelCmds.length) {
      await exec(fileDelCmds.join(` && `));
    }

    let fileCopyCmds = [];
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
          fileCopyCmds.push(`mkdir -p $(dirname ${desFile})`);
          fileCopyCmds.push(`cp ${sourceFile} ${desFile}`);
        }
      }
    }
    if (fileCopyCmds.length) {
      await exec(fileCopyCmds.join(` && `));
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

function updateMainFromFolder(commitMsg) {
  console.log("Updating origin from local folder...");
}

function showHelp() {
  console.log("Invalid argument");
}

function getAllFiles(dir) {
  return fs
    .readdirSync(dir)
    .reduce(
      (files, file) =>
        fs.statSync(path.join(dir, file)).isDirectory()
          ? files.concat(getAllFiles(path.join(dir, file)))
          : files.concat(path.join(dir, file)),
      []
    );
}
