const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const params = process.argv;
const PARAM_INDEX = 2;

switch (params[PARAM_INDEX]) {
  case "init":
    // git-folder-sync init [repo url] [first/folder/path] [second/folder/path] [name of local root folder]
    initializeFolder(
      params[PARAM_INDEX + 1],
      params.slice(PARAM_INDEX + 2, params.length - 1),
      params[params.length - 1]
    );
    break;
  case "pull":
    // git-folder-sync pull
    updateLocalFolderFromOrgin();
    break;
  case "push":
    // git-folder-sync push [commit message]
    updateOriginFromLocalFolder(params[PARAM_INDEX + 1]);
    break;
  default:
    showHelp();
}

async function initializeFolder(repoUrl, folderPaths, localFolderName) {
  console.log("Initializing Folder...");

  const dirPath = path.resolve(__dirname, localFolderName);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath);
  }

  // Preparing commands
  let commands = [];
  commands.push(`cd ${dirPath}`);
  commands.push(`git init`);
  commands.push(`git remote add origin ${repoUrl}`);
  commands.push(`git config core.sparseCheckout true`); // sparse checkout supported since git v1.7
  folderPaths.forEach(path => commands.push(`echo "${path}" >> .git/info/sparse-checkout`));
  commands.push(`git pull origin master`);

  //Executing commands
  const cmdExec = exec(commands.join(` && `));
  cmdExec.stdout.pipe(process.stdout);
  cmdExec.stderr.pipe(process.stdout);
  cmdExec.on("close", code => {
    if (code) {
      console.log(`Error code: ${code}`);
    }
  });

  // TODO: Delete previous commits
}

function updateLocalFolderFromOrgin() {
  console.log("Updating local folder from origin...");

  // Preparing commands
  let commands = []
  commands.push(`git checkout master`)
  commands.push(`git pull origin master`)

  // Executing commands
  const pullCmd = exec(commands.join(` && `))
  pullCmd.stdout.pipe(process.stdout);
  pullCmd.stderr.pipe(process.stdout);
  pullCmd.on("close", code => {
    if (code) {
      console.log(`Error code: ${code}`);
    }
  });

  // TODO: Delete previous commits rebasing other branches
}

function updateOriginFromLocalFolder(commitMsg) {
  console.log("Updating origin from local folder...");
}

function showHelp() {
  console.log("Invalid argument");
}
