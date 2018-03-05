const fs = require("fs-extra");
const path = require("path");
const Git = require("nodegit");
const readlineSync = require("readline-sync");
const { TEMPORARY_FOLDER_NAME } = require("./constants");
const COMMIT_MSG_PREFIX = "git-slice:";

async function getAllFiles(dir) {
  try {
    let results = [];
    const list = await fs.readdir(dir);
    if (!list.length) return results;
    for (let file of list) {
      file = path.resolve(dir, file);
      const stat = await fs.stat(file);
      if (stat && stat.isDirectory()) {
        results = results.concat(await getAllFiles(file));
      } else {
        results.push(file);
      }
    }
    return results;
  } catch (e) {
    console.log(e);
  }
}

async function getCurBranch(repo) {
  return (await repo.getCurrentBranch()).name().replace("refs/heads/", "");
}

function addCommmitMsgPrefix(msg) {
  return COMMIT_MSG_PREFIX + msg;
}

function removeCommitMsgPrefix(msg) {
  return msg.replace(COMMIT_MSG_PREFIX, "");
}

function ensureArray(input) {
  if (!input) {
    return [];
  } else {
    return Array.isArray(input) ? input : [input];
  }
}

async function getLastGitSliceCommitHash(repo) {
  const revwalk = Git.Revwalk.create(repo);
  revwalk.pushHead();
  const commits = await revwalk.getCommitsUntil(c => true);
  const commit = commits
    .find(x => x.message().indexOf(COMMIT_MSG_PREFIX) === 0)
    .message();
  return commit.replace(COMMIT_MSG_PREFIX, "");
}

function promptForCredentials(url, existingUserName) {
  console.log(`Credentials required to access ${url}`);
  const userName = readlineSync.question("Username: ");
  const password = readlineSync.question("Password: ", {
    hideEchoBack: true
  });
  return Git.Cred.userpassPlaintextNew(userName, password);
}

async function getTempRepo(mainUrl, branch) {
  const mainRepoPath = TEMPORARY_FOLDER_NAME;
  try {
    // Git repo exits so lets just update it
    const repo = await Git.Repository.open(mainRepoPath);
    try {
      await repo.fetch("origin", {
        callbacks: {
          credentials: promptForCredentials
        }
      });
      await repo.mergeBranches(branch, `origin/${branch}`);
    } catch (e) {
      console.error(`Unable to update ${mainUrl}`);
      return null;
    }
  } catch (e) {
    // Git repo does not exits so lets clone it
    await fs.remove(mainRepoPath);
    try {
      await Git.Clone.clone(mainUrl, mainRepoPath, {
        fetchOpts: {
          callbacks: {
            credentials: promptForCredentials
          }
        }
      });
    } catch (e) {
      console.error(`Unable to clone ${mainUrl}`);
      return null;
    }
  }
  return mainRepoPath;
}

async function pushTempRepo(branch) {
  const mainRepoPath = TEMPORARY_FOLDER_NAME;
  const repo = await Git.Repository.open(mainRepoPath);
  const origin = await repo.getRemote("origin");
  await origin.push([`refs/heads/${branch}:refs/heads/${branch}`], {
    callbacks: {
      credentials: promptForCredentials
    }
  });
}

async function copyFiles(source, destination, folders, ignored) {
  const repo = await Git.Repository.open(source);
  const ignoredFiles = ignored.map(f => path.resolve(source, f));
  for (let p of folders) {
    const allFiles = await getAllFiles(path.resolve(source, p));
    for (let sourceFile of allFiles) {
      const isGitIgnored = await Git.Ignore.pathIsIgnored(repo, sourceFile);
      if (!isGitIgnored && ignoredFiles.indexOf(sourceFile) === -1) {
        const desFile = sourceFile.replace(source, destination);
        await fs.ensureFile(desFile);
        await fs.copy(sourceFile, desFile);
      }
    }
  }
}

async function deleteFiles(source, ignored) {
  const repo = await Git.Repository.open(source);
  const ignoredFiles = ignored.map(f => path.resolve(source, f));
  for (let file of await getAllFiles(source)) {
    const isGitIgnored = await Git.Ignore.pathIsIgnored(repo, file);
    if (!isGitIgnored && ignoredFiles.indexOf(file) === -1) {
      await fs.remove(file);
    }
  }
}

module.exports = {
  getAllFiles,
  getCurBranch,
  addCommmitMsgPrefix,
  removeCommitMsgPrefix,
  ensureArray,
  getLastGitSliceCommitHash,
  getTempRepo,
  copyFiles,
  deleteFiles,
  pushTempRepo
};
